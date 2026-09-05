import { beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultSettings, loadLogs, loadSettings, saveLogs, saveSettings, exportBackupJSON, importBackupJSON, persistBackup, LOGS_KEY, SETTINGS_KEY, StoragePersistenceError } from '../../src/utils/storage.ts';
import { parseDateKey, formatDateKey, diffDays, isDateKey } from '../../src/utils/dateKey.ts';
import { getAllLogsFromDB, getSettingsFromDB, saveAllLogsToDB, wipeAllLocalData } from '../../src/services/storageEngine.ts';
import { resolveStoredSession } from '../../src/services/authSession.ts';
import { parseUniversalData, commitConfirmedImport, normalizeImportDate } from '../../src/services/universalImporter.ts';
import { calculateCycleStatistics, calculateUpcomingMilestones, predictDayStatus, extractPeriodClusters } from '../../src/services/predictiveEngine.ts';
import { generateDailyWellnessAdvice, generateDailyWellnessCarousel } from '../../src/services/wellnessAgent.ts';
import { analyzeChronicleNote } from '../../src/services/chroniclerAgent.ts';
import { updateSymptothermalLog } from '../../src/utils/dailyLog.ts';

class MemoryStorage {
  getItem(key) { return Object.hasOwn(this, key) ? this[key] : null; }
  setItem(key, value) { Object.defineProperty(this, key, { value: String(value), configurable: true, enumerable: true, writable: true }); }
  removeItem(key) { delete this[key]; }
}
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalFetch = globalThis.fetch;
const entry = (date, fields = {}) => ({ date, isPeriod: false, symptoms: [], ...fields });
const settings = fields => ({ ...getDefaultSettings(), ...fields });
const offline = async () => { throw new TypeError('Offline'); };
beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
  globalThis.fetch = offline;
});
after(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

test('empty reads do not write invented records or preferences', () => {
  assert.deepEqual(loadLogs(), {});
  assert.deepEqual(loadSettings(), getDefaultSettings());
  assert.deepEqual(Object.keys(localStorage), []);
});

test('explicit undefined deletes temperature and mucus from persisted records, including legacy BBT', () => {
  const original = entry('2026-08-10', { bbt: 36.55, cervicalMucus: 'creamy', biomarkers: { bbt: 36.55, progesterone: { value: 8, unit: 'ng/mL' } } });
  const updated = updateSymptothermalLog(original, { bbt: undefined, cervicalMucus: undefined });
  saveLogs({ [updated.date]: updated });
  const restored = loadLogs()[updated.date];
  assert.equal(restored.bbt, undefined);
  assert.equal(restored.cervicalMucus, undefined);
  assert.equal(restored.biomarkers.bbt, undefined);
  assert.equal(restored.biomarkers.progesterone.value, 8);
  assert.equal(original.bbt, 36.55);
});

test('omitting temperature or mucus preserves the other measurement', () => {
  const original = entry('2026-08-10', { bbt: 36.55, cervicalMucus: 'creamy' });
  assert.equal(updateSymptothermalLog(original, { cervicalMucus: undefined }).bbt, 36.55);
  assert.equal(updateSymptothermalLog(original, { bbt: undefined }).cervicalMucus, 'creamy');
});

test('account changes isolate histories from other accounts and private local mode', () => {
  const log = entry('2026-08-10', { notes: 'Private local record' });
  saveLogs({ [log.date]: log });
  localStorage.setItem('token', 'remote-token');
  localStorage.setItem('cached_user', JSON.stringify({ id: 'account-a', email: 'a@example.com' }));
  assert.deepEqual(loadLogs(), {});
  saveLogs({ '2026-08-11': entry('2026-08-11', { notes: 'Account A' }) });
  localStorage.setItem('cached_user', JSON.stringify({ id: 'account-b', email: 'b@example.com' }));
  assert.deepEqual(loadLogs(), {});
  localStorage.setItem('token', 'local-session');
  assert.deepEqual(loadLogs(), { [log.date]: log });
});

test('corrupted storage cannot be overwritten by a routine save but can be restored explicitly', () => {
  localStorage.setItem(LOGS_KEY, '{broken');
  assert.deepEqual(loadLogs(), {});
  assert.throws(() => saveLogs({}), StoragePersistenceError);
  assert.equal(localStorage.getItem(LOGS_KEY), '{broken');
  persistBackup(settings({}), { '2026-08-10': entry('2026-08-10') });
  assert.equal(Object.keys(loadLogs()).length, 1);
});

test('local sessions never use the network and retain the complete record', async () => {
  const log = entry('2026-08-10', { notes: 'Private note', intimacyLog: { activity: 'protected' }, medications: [{ id: 'm', name: 'Example', type: 'medication', taken: false }], biomarkers: { progesterone: { value: 8.2, unit: 'ng/mL' } } });
  localStorage.setItem('token', 'local-session');
  globalThis.fetch = () => assert.fail('A private session must not contact the server');
  await saveAllLogsToDB({ [log.date]: log });
  assert.deepEqual(await getAllLogsFromDB(), { [log.date]: log });
});

test('offline remote hydration returns saved data and settings', async () => {
  localStorage.setItem('token', 'remote-token');
  const log = entry('2026-08-10', { isPeriod: true, notes: 'Preserve' });
  saveLogs({ [log.date]: log });
  saveSettings(settings({ userName: 'Local name' }));
  assert.deepEqual(await getAllLogsFromDB(), { [log.date]: log });
  assert.equal((await getSettingsFromDB()).userName, 'Local name');
});

test('signed-in hydration prefers account settings when the server is reachable', async () => {
  localStorage.setItem('token', 'remote-token');
  saveSettings(settings({ userName: 'Cached device name' }));
  globalThis.fetch = async () => Response.json({ userName: 'Other device name', averageCycleLength: 31, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: '', theme: 'light' });
  const restored = await getSettingsFromDB();
  assert.equal(restored.userName, 'Other device name');
  assert.equal(restored.averageCycleLength, 31);
});

test('a rejected remote save fails explicitly but keeps the local snapshot', async () => {
  localStorage.setItem('token', 'remote-token');
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  const log = entry('2026-08-10', { notes: 'Still here' });
  await assert.rejects(saveAllLogsToDB({ [log.date]: log }), /503/);
  assert.equal(loadLogs()[log.date].notes, 'Still here');
});

test('GET logs supports the full JSONB payload with canonical server columns', async () => {
  localStorage.setItem('token', 'remote-token');
  globalThis.fetch = async () => Response.json([{ date: '2026-08-10', is_period: true, flow: 'light', symptoms: [], recorded_at: '2026-08-10T18:00:00Z', data: { notes: 'Remote note', intimacyLog: { activity: 'protected' }, isPeriod: false, biomarkers: { bbt: 36.5 } } }]);
  const log = (await getAllLogsFromDB())['2026-08-10'];
  assert.equal(log.isPeriod, true);
  assert.equal(log.notes, 'Remote note');
  assert.equal(log.biomarkers.bbt, 36.5);
  assert.equal(log.intimacyLog.activity, 'protected');
});

test('legacy remote data does not erase richer local records', async () => {
  localStorage.setItem('token', 'remote-token');
  saveLogs({ '2026-08-10': entry('2026-08-10', { notes: 'Local note', recordedAt: '2026-08-10T10:00:00Z', intimacyLog: { activity: 'protected' } }) });
  globalThis.fetch = async () => Response.json([{ date: '2026-08-10', is_period: true, symptoms: [], recorded_at: '2026-08-10T12:00:00Z' }]);
  const log = (await getAllLogsFromDB())['2026-08-10'];
  assert.equal(log.notes, 'Local note');
  assert.equal(log.intimacyLog.activity, 'protected');
  assert.equal(log.isPeriod, true);
});

test('bulk writes send all DailyLog fields', async () => {
  localStorage.setItem('token', 'remote-token');
  let sent;
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return Response.json({}); };
  const log = entry('2026-08-10', { notes: 'Complete', biomarkers: { bbt: 36.5 } });
  await saveAllLogsToDB({ [log.date]: log });
  assert.deepEqual(sent.logs[0], log);
});

test('backup round trip retains sparse dates and every log field', async () => {
  const logs = { '2026-08-01': entry('2026-08-01', { isPeriod: true }), '2026-08-30': entry('2026-08-30', { notes: 'No bleeding', biomarkers: { bbt: 36.5 } }) };
  const json = exportBackupJSON(settings({ userName: 'Aura user' }), logs);
  assert.deepEqual(importBackupJSON(json).logs, logs);
  const parsed = await parseUniversalData(json);
  assert.equal(parsed.backup.settings.userName, 'Aura user');
  assert.deepEqual(commitConfirmedImport(parsed, {}), logs);
});

test('invalid, future-version and prototype-bearing backups are rejected', () => {
  for (const raw of ['{"version":2,"settings":{},"logs":{}}', '{"settings":{},"logs":[]}', '{"settings":{"__proto__":{"polluted":true}},"logs":{}}', '{"settings":{"averageCycleLength":0},"logs":{}}', '{"settings":{},"logs":{"2026-02-30":{"isPeriod":true,"symptoms":[]}}}']) assert.throws(() => importBackupJSON(raw));
  assert.equal({}.polluted, undefined);
});

test('storage quota errors are not silently reported as successful saves', () => {
  localStorage.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); };
  assert.throws(() => saveLogs({}), StoragePersistenceError);
});

test('failed restore rolls both collections back', () => {
  const oldLogs = { '2026-08-01': entry('2026-08-01') };
  saveLogs(oldLogs);
  saveSettings(settings({ userName: 'Before' }));
  const originalSet = localStorage.setItem.bind(localStorage);
  let failOnce = true;
  Object.defineProperty(localStorage, 'setItem', { value: (key, value) => {
    if (key === SETTINGS_KEY && failOnce) { failOnce = false; throw new DOMException('Quota', 'QuotaExceededError'); }
    originalSet(key, value);
  }, configurable: true });
  assert.throws(() => persistBackup(settings({ userName: 'After' }), {}));
  assert.deepEqual(loadLogs(), oldLogs);
  assert.equal(loadSettings().userName, 'Before');
});

test('wipe removes only owned data, including user chat histories', async () => {
  for (const key of [LOGS_KEY, SETTINGS_KEY, 'aura_chat_v1:local_user', 'regla_greeted_2026-09-04', 'other_app', 'aura_unrelated']) localStorage.setItem(key, 'value');
  await wipeAllLocalData();
  assert.deepEqual(Object.keys(localStorage).sort(), ['aura_unrelated', 'other_app']);
});

test('401 and 403 invalidate cached sessions', async () => {
  for (const status of [401, 403]) {
    localStorage.setItem('token', 'remote-token');
    localStorage.setItem('cached_user', JSON.stringify({ id: 'u1', email: 'example@example.com' }));
    globalThis.fetch = async () => new Response('{}', { status });
    assert.equal(await resolveStoredSession(), null);
    assert.equal(localStorage.getItem('token'), null);
  }
});

test('network failure restores only a valid cached user, never a fabricated one', async () => {
  localStorage.setItem('token', 'remote-token');
  assert.equal(await resolveStoredSession(), null);
  localStorage.setItem('cached_user', JSON.stringify({ id: 'u1', email: 'example@example.com' }));
  assert.equal((await resolveStoredSession()).user.id, 'u1');
});

test('production ignores development bypass', async () => {
  localStorage.setItem('dev_bypass_auth', 'true');
  assert.equal(await resolveStoredSession(), null);
});

test('CSV quotes, multiline cells, duplicates and sparse days preserve actual records', async () => {
  const parsed = await parseUniversalData('date,flow,symptoms,sex\n2026-08-01,light,"Pain, mild\nthen gone",yes\n2026-08-03,heavy,cramps,protected\n2026-08-03,heavy,cramps,protected');
  const logs = commitConfirmedImport(parsed, {});
  assert.deepEqual(Object.keys(logs), ['2026-08-01', '2026-08-03']);
  assert.equal(logs['2026-08-01'].flow, 'light');
  assert.equal(logs['2026-08-03'].flow, 'heavy');
  assert.equal(logs['2026-08-01'].symptoms[0].name, 'Pain, mild\nthen gone');
  assert.equal(logs['2026-08-01'].intimacyLog.activity, 'other');
  assert.equal(logs['2026-08-03'].symptoms.length, 1);
});

test('CSV Spanish headers and spotting do not create a menstrual cycle', async () => {
  const parsed = await parseUniversalData('fecha;sangrado;sintomas\n1/8/2026;manchado;dolor');
  const logs = commitConfirmedImport(parsed, {});
  assert.equal(logs['2026-08-01'].isPeriod, false);
  assert.equal(logs['2026-08-01'].flow, 'spotting');
});

test('invalid dates, inverted ranges and malformed CSV fail before import', async () => {
  for (const content of ['date,flow\n2026-02-30,heavy', 'regla del 16 al 12 de mayo de 2026', 'date,flow\n2026-08-01,"heavy', 'regla del 30 al 31 de febrero de 2026']) await assert.rejects(parseUniversalData(content));
});

test('lab parser extracts numeric groups and retains original units', async () => {
  const parsed = await parseUniversalData('Fecha: 10/08/2026\nProgesterona (Fase lutea): 14,8 nmol/L\nEstradiol (E2): 185 pg/mL\nLH (Hormona Luteinizante): 38.5 mIU/mL\nFSH: 6.2 mIU/mL\nAMH: 3.1 ng/mL\nTSH: 2.4 µUI/mL');
  assert.equal(parsed.biomarkers.length, 6);
  const logs = commitConfirmedImport(parsed, {});
  assert.equal(logs['2026-08-10'].biomarkers.progesterone.value, 14.8);
  assert.equal(logs['2026-08-10'].biomarkers.progesterone.unit, 'nmol/L');
  assert.equal(logs['2026-08-10'].biomarkers.lh.value, 38.5);
  assert.match(logs['2026-08-10'].biomarkers.notes, /TSH: 2.4/);
});

test('import does not mutate source logs and reimport does not duplicate symptoms', async () => {
  const original = { '2026-08-10': entry('2026-08-10', { notes: 'Keep', symptoms: [] }) };
  const snapshot = structuredClone(original);
  const parsed = await parseUniversalData('date,symptoms\n2026-08-10,cramps');
  const first = commitConfirmedImport(parsed, original);
  const second = commitConfirmedImport(parsed, first);
  assert.deepEqual(original, snapshot);
  assert.equal(second['2026-08-10'].symptoms.length, 1);
  assert.equal(second['2026-08-10'].notes, 'Keep');
});

test('calendar parsing rejects rollover dates and preserves leap days/timezones', () => {
  assert.equal(isDateKey('2024-02-29'), true);
  assert.equal(isDateKey('2026-02-29'), false);
  assert.ok(Number.isNaN(parseDateKey('2026-02-30').getTime()));
  assert.equal(normalizeImportDate('2026-08-10 23:30:00 -0700'), '2026-08-10');
  assert.equal(diffDays(parseDateKey('2026-03-28'), parseDateKey('2026-03-30')), 2);
  assert.equal(formatDateKey(parseDateKey('2026-08-10')), '2026-08-10');
});

test('empty and symptom-only histories never fabricate a cycle anchor or milestones', () => {
  for (const logs of [{}, { '2026-08-10': entry('2026-08-10', { notes: 'Tired' }) }]) {
    const stats = calculateCycleStatistics(logs, settings({}));
    assert.equal(stats.lastVerifiedPeriodStart, '');
    assert.equal(stats.confidenceScore, 0);
    assert.equal(predictDayStatus('2026-08-10', stats, logs).isPeriod, false);
    assert.equal(calculateUpcomingMilestones(stats, '2026-08-10').nextPeriodStartDate, '');
  }
});

test('spotting, irregular bleeding and future records do not calibrate cycles', () => {
  const logs = { '2026-08-10': entry('2026-08-10', { isPeriod: true, flow: 'spotting' }), '2026-08-11': entry('2026-08-11', { isPeriod: true, isIrregularBleeding: true }), '2099-08-10': entry('2099-08-10', { isPeriod: true }) };
  assert.equal(calculateCycleStatistics(logs, settings({})).lastVerifiedPeriodStart, '');
  assert.equal(extractPeriodClusters({ '2026-08-10': logs['2026-08-10'] }, '').length, 0);
});

test('explicit starts preserve two close recorded cycles', () => {
  const logs = { '2026-08-10': entry('2026-08-10', { isPeriod: true }), '2026-08-12': entry('2026-08-12', { isPeriod: true, isCycleStart: true }) };
  assert.equal(extractPeriodClusters(logs, '').length, 2);
});

test('next ovulation uses this cycle and the same day convention as the calendar', () => {
  const stats = calculateCycleStatistics({}, settings({ lastPeriodStartDate: '2026-08-01' }));
  const milestones = calculateUpcomingMilestones(stats, '2026-08-05');
  assert.equal(milestones.nextOvulationDate, '2026-08-14');
  assert.equal(milestones.daysUntilNextOvulation, 9);
  assert.equal(predictDayStatus(milestones.nextOvulationDate, stats, {}).isOvulationDay, true);
  assert.equal(calculateUpcomingMilestones(stats, '2026-08-29').daysUntilNextPeriod, 0);
});

test('a missed expected period stays visible as overdue instead of skipping a cycle', () => {
  const stats = calculateCycleStatistics({}, settings({ lastPeriodStartDate: '2026-08-01' }));
  const milestones = calculateUpcomingMilestones(stats, '2026-08-30');
  assert.equal(milestones.nextPeriodStartDate, '2026-08-29');
  assert.equal(milestones.daysUntilNextPeriod, -1);
});

test('hormonal contraception suppresses fertile milestones', () => {
  const stats = calculateCycleStatistics({}, settings({ lastPeriodStartDate: '2026-08-01', cycleProfile: { birthControl: 'pill', regularity: 'regular', typicalCramps: 'none' } }));
  const milestones = calculateUpcomingMilestones(stats, '2026-08-05');
  assert.equal(milestones.nextOvulationDate, '');
  assert.equal(milestones.nextFertileWindowStart, '');
  assert.ok(stats.insights.every(value => typeof value === 'string'));
});

test('historical cycle day uses its recorded start despite a different latest cycle length', () => {
  const logs = Object.fromEntries(['2026-06-01', '2026-07-02', '2026-08-01'].map(date => [date, entry(date, { isPeriod: true })]));
  const stats = calculateCycleStatistics(logs, settings({}));
  assert.equal(predictDayStatus('2026-06-01', stats, logs).dayOfCycle, 1);
  assert.equal(predictDayStatus('2026-07-02', stats, logs).dayOfCycle, 1);
});

test('the complete deterministic wellness catalogue runs with network disabled', async () => {
  globalThis.fetch = () => assert.fail('Local catalogue must not use the network');
  for (const phase of ['menstrual', 'follicular', 'ovulation', 'luteal']) {
    const context = { date: '2026-08-10', dayOfCycle: 3, phase, isPeriod: phase === 'menstrual', isOvulationDay: phase === 'ovulation', isFertileWindow: false, hasEnoughData: true, symptoms: [] };
    const cards = generateDailyWellnessCarousel(context);
    assert.deepEqual(cards.map(card => card.category), ['physiology', 'nutrition', 'movement', 'mindset']);
    assert.ok(cards.every(card => card.advice && card.headline && card.focusTip));
    assert.ok(generateDailyWellnessAdvice(context).advice);
  }
  const note = await analyzeChronicleNote('Estoy cansada', { selectedDate: '2026-08-10', todayDate: '2026-08-10' });
  assert.equal(note.success, true);
  assert.ok(note.data.energy);
});


test('very heavy bleeding advice takes priority over onboarding and personalized prompts', () => {
  const base = {
    date: '2026-08-10',
    dayOfCycle: 1,
    phase: 'menstrual',
    isPeriod: true,
    isOvulationDay: false,
    isFertileWindow: false,
    hasEnoughData: false,
    symptoms: [],
    flow: 'very_heavy',
    worstDayOfPeriod: 1
  };
  assert.equal(generateDailyWellnessAdvice(base).id, 'very_heavy_flow_care');
});
