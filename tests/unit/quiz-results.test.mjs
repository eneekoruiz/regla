import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { HEALTH_QUIZZES } from '../../src/data/healthQuizzes.ts';
import { addQuizResultToLogs } from '../../src/services/quizResults.ts';
import { getAllLogsFromDB, saveAllLogsToDB, wipeAllLocalData } from '../../src/services/storageEngine.ts';
import { validateLogs, validateQuizResult } from '../../src/utils/dataValidation.ts';
import { generateDaysRange } from '../../src/utils/cycleCalculator.ts';
import { exportBackupJSON, getDefaultSettings, getDataStorageKey, importBackupJSON, loadLogs, LOGS_KEY, persistBackup, saveLogs, StoragePersistenceError } from '../../src/utils/storage.ts';

class MemoryStorage {
  getItem(key) { return Object.hasOwn(this, key) ? this[key] : null; }
  setItem(key, value) { Object.defineProperty(this, key, { value: String(value), configurable: true, enumerable: true, writable: true }); }
  removeItem(key) { delete this[key]; }
}

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalFetch = globalThis.fetch;
const date = '2026-08-10';
const stressResult = (fields = {}) => ({
  quizId: 'stress_check', completedAt: '2026-09-04T12:00:00.000Z',
  answers: { stress_q1: 3, stress_q2: 'sometimes', stress_q3: false }, ...fields
});
const persistResult = (result, targetDate = date) => saveLogs(addQuizResultToLogs(loadLogs(), result, targetDate));
const remoteSession = id => {
  localStorage.setItem('token', `remote-token-${id}`);
  localStorage.setItem('cached_user', JSON.stringify({ id, email: `${id}@example.com` }));
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
  globalThis.fetch = () => assert.fail('This operation must not require the network');
});

after(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

test('every local quiz accepts complete answers and persists without a network', async () => {
  let logs = {};
  for (const quiz of Object.values(HEALTH_QUIZZES)) {
    const result = {
      quizId: quiz.id, completedAt: '2026-09-04T12:00:00.000Z',
      answers: Object.fromEntries(quiz.questions.map(question => [question.id,
        question.type === 'boolean' ? false : question.type === 'slider' ? question.min ?? 0 : question.options[0].id
      ]))
    };
    logs = addQuizResultToLogs(logs, result, date);
  }
  await saveAllLogsToDB(logs);
  assert.deepEqual((await getAllLogsFromDB())[date].quizResults, logs[date].quizResults);
  assert.equal(loadLogs()[date].quizResults.length, Object.keys(HEALTH_QUIZZES).length);
});

test('saving targets the selected historical day and preserves all existing fields', () => {
  const existing = { date, isPeriod: true, flow: 'light', symptoms: [], notes: 'Keep this note',
    bbt: 36.55, cervicalMucus: 'creamy', medications: [{ id: 'm1', name: 'Vitamin', type: 'supplement', taken: true }] };
  saveLogs({ [date]: existing });
  const result = stressResult();
  persistResult(result);
  const { quizResults, recordedAt, ...restored } = loadLogs()[date];
  assert.deepEqual(restored, existing);
  assert.deepEqual(quizResults, [result]);
  assert.ok(Number.isFinite(Date.parse(recordedAt)));
  assert.deepEqual(Object.keys(loadLogs()), [date]);
});

test('retries do not duplicate results but later completions remain in history', () => {
  persistResult(stressResult());
  persistResult(stressResult());
  assert.equal(loadLogs()[date].quizResults.length, 1);
  const next = stressResult({ completedAt: '2026-09-04T13:00:00.000Z' });
  persistResult(next);
  assert.deepEqual(loadLogs()[date].quizResults, [stressResult(), next]);
});

test('results are detached from caller input and previous log objects', () => {
  const original = { [date]: { date, isPeriod: false, symptoms: [], notes: 'Original' } };
  const before = structuredClone(original);
  const result = stressResult();
  const updated = addQuizResultToLogs(original, result, date);
  result.answers.stress_q1 = 5;
  assert.equal(updated[date].quizResults[0].answers.stress_q1, 3);
  assert.deepEqual(original, before);
});

test('invalid dates and unknown questionnaires fail without overwriting saved data', () => {
  persistResult(stressResult());
  const before = localStorage.getItem(LOGS_KEY);
  for (const invalid of ['', '2026-02-30', '10/08/2026', '__proto__']) {
    assert.throws(() => persistResult(stressResult(), invalid));
  }
  assert.throws(() => persistResult(stressResult({ quizId: 'unknown_quiz' })));
  assert.equal(localStorage.getItem(LOGS_KEY), before);
});

test('incomplete, unknown, mistyped and out-of-range answers are rejected', () => {
  persistResult(stressResult());
  const before = localStorage.getItem(LOGS_KEY);
  const valid = stressResult().answers;
  const invalidAnswers = [
    {}, { stress_q1: 3, stress_q2: 'no' }, { ...valid, extra: true },
    { stress_q1: 3, stress_q2: 'no', replaced: true },
    { ...valid, stress_q1: '3' }, { ...valid, stress_q1: 0 }, { ...valid, stress_q1: 6 },
    { ...valid, stress_q1: 2.5 }, { ...valid, stress_q1: Number.NaN },
    { ...valid, stress_q1: Infinity }, { ...valid, stress_q2: 'unknown' },
    { ...valid, stress_q3: 'false' }, { ...valid, stress_q3: null }
  ];
  for (const answers of invalidAnswers) assert.throws(() => persistResult(stressResult({ answers })));
  assert.equal(localStorage.getItem(LOGS_KEY), before);
});

test('persisted result validation rejects malformed metadata and dangerous keys', () => {
  for (const value of [null, [], stressResult({ quizId: '' }), stressResult({ completedAt: '2026-02-30T12:00:00Z' }),
    stressResult({ completedAt: 'not-a-date' }), stressResult({ completedAt: date }), stressResult({ totalScore: Infinity }),
    stressResult({ answers: [] }), stressResult({ answers: { q: {} } }),
    stressResult({ answers: JSON.parse('{"__proto__":true}') }),
    stressResult({ answers: { constructor: true } }), stressResult({ answers: { prototype: true } })
  ]) assert.throws(() => validateQuizResult(value));
  assert.equal({}.polluted, undefined);
});

test('backups restore full quiz history, including valid retired quiz identifiers', () => {
  const historic = { quizId: 'retired_quiz_v1', completedAt: '2020-02-29T10:00:00Z', answers: { old_question: 0 }, totalScore: 0 };
  const logs = { [date]: { date, isPeriod: false, symptoms: [], quizResults: [historic, stressResult()] } };
  const json = exportBackupJSON(getDefaultSettings(), logs);
  const backup = importBackupJSON(json);
  persistBackup(backup.settings, backup.logs);
  assert.deepEqual(loadLogs(), logs);
});

test('invalid quiz histories fail backup validation before replacing local data', () => {
  persistResult(stressResult());
  const before = localStorage.getItem(LOGS_KEY);
  for (const quizResults of [{}, [stressResult({ answers: { q: null } })], Array(1001).fill(stressResult())]) {
    const logs = { [date]: { date, isPeriod: false, symptoms: [], quizResults } };
    assert.throws(() => validateLogs(logs));
    assert.throws(() => importBackupJSON(JSON.stringify({ version: 1, settings: getDefaultSettings(), logs })));
  }
  assert.equal(localStorage.getItem(LOGS_KEY), before);
});

test('quiz histories remain isolated between private mode and remote accounts', () => {
  persistResult(stressResult());
  remoteSession('account-a');
  assert.deepEqual(loadLogs(), {});
  const resultA = stressResult({ answers: { stress_q1: 1, stress_q2: 'no', stress_q3: true } });
  persistResult(resultA);
  remoteSession('account-b');
  assert.deepEqual(loadLogs(), {});
  persistResult(stressResult(), '2026-08-11');
  remoteSession('account-a');
  assert.deepEqual(loadLogs()[date].quizResults, [resultA]);
  localStorage.removeItem('token');
  assert.deepEqual(loadLogs()[date].quizResults, [stressResult()]);
});

test('storage failures throw synchronously and leave earlier quiz history intact', () => {
  persistResult(stressResult());
  const before = localStorage.getItem(LOGS_KEY);
  Object.defineProperty(localStorage, 'setItem', { value: () => { throw new DOMException('Quota', 'QuotaExceededError'); } });
  assert.throws(() => persistResult(stressResult({ completedAt: '2026-09-04T13:00:00Z' })), StoragePersistenceError);
  assert.equal(localStorage.getItem(LOGS_KEY), before);
});

test('remote synchronization carries quiz results in the complete DailyLog', async () => {
  remoteSession('account-a');
  let body;
  globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return Response.json({}); };
  const logs = addQuizResultToLogs({}, stressResult(), date);
  await saveAllLogsToDB(logs);
  assert.deepEqual(body.logs[0].quizResults, [stressResult()]);
  localStorage.removeItem(getDataStorageKey(LOGS_KEY));
  globalThis.fetch = async () => Response.json([{ date, is_period: false, symptoms: [], recorded_at: logs[date].recordedAt, data: logs[date] }]);
  assert.deepEqual((await getAllLogsFromDB())[date].quizResults, [stressResult()]);
});

test('failed synchronization keeps the complete quiz result locally', async () => {
  remoteSession('account-a');
  globalThis.fetch = async () => { throw new TypeError('Offline'); };
  await assert.rejects(saveAllLogsToDB(addQuizResultToLogs({}, stressResult(), date)), /Offline/);
  assert.deepEqual(loadLogs()[date].quizResults, [stressResult()]);
});

test('clearing Aura data removes stored quiz histories without touching unrelated keys', async () => {
  persistResult(stressResult());
  localStorage.setItem('unrelated', 'keep');
  await wipeAllLocalData();
  assert.deepEqual(loadLogs(), {});
  assert.equal(localStorage.getItem('unrelated'), 'keep');
});

test('the today marker refreshes independently of the selected timeline center', () => {
  const selected = '2026-08-10';
  for (const today of ['2026-08-11', '2026-08-12']) {
    const days = generateDaysRange(selected, selected, 45, 45, getDefaultSettings(), {}, today);
    assert.deepEqual(days.filter(day => day.isToday).map(day => day.date), [today]);
    assert.equal(days[45].date, selected);
  }
});

test('a historical timeline stays bounded and includes its selected day', () => {
  for (const selectedDate of ['2020-02-29', '2025-12-31', '2026-03-29']) {
    const days = generateDaysRange(selectedDate, selectedDate, 45, 45, getDefaultSettings(), {});
    assert.equal(days.length, 91);
    assert.equal(days[45].date, selectedDate);
    assert.deepEqual(days.filter(day => day.isSelected).map(day => day.date), [selectedDate]);
    assert.equal(new Set(days.map(day => day.date)).size, 91);
  }
});
