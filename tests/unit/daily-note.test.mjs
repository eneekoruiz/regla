import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileFunction } from 'node:vm';
import ts from 'typescript';
import { StoragePersistenceError } from '../../src/utils/storage.ts';

const source = ts.createSourceFile('CycleContext.tsx', readFileSync(new URL('../../src/context/CycleContext.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'processDailyNote') callback = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(callback, 'CycleContext must expose the daily-note operation');
// Run the actual provider callback with controlled dependencies, without a browser or copied logic.
const javascript = ts.transpileModule(`const processDailyNote = ${callback.getText(source)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const createCallback = compileFunction(`
  const { analyzeChronicleNote, selectedDate, todayDate, currentDayInfo, updateLogs, setLastChroniclerResponse } = dependencies;
  ${javascript}
  return processDailyNote;
`, ['dependencies']);

const date = '2026-08-10';
const analysis = () => ({
  success: true, empathyMessage: 'Saved',
  data: { targetDate: date, period: { detected: false, isPeriod: false }, physicalSymptoms: [], moods: [], energy: null, extractedSummary: [] }
});
function harness(response, persistenceError) {
  const events = [];
  let logs = {};
  const process = createCallback({
    analyzeChronicleNote: async () => response,
    selectedDate: date, todayDate: '2026-09-04', currentDayInfo: { dayOfCycle: 0, phase: 'follicular' },
    updateLogs: updater => {
      events.push('save');
      if (persistenceError) throw persistenceError;
      logs = updater(logs);
    },
    setLastChroniclerResponse: value => { events.push('publish'); assert.equal(value, response); }
  });
  return { process, events, getLogs: () => logs };
}

test('a daily-note confirmation is published only after local persistence succeeds', async () => {
  const response = analysis();
  const { process, events, getLogs } = harness(response);
  assert.equal(await process('Keep this note', '2026-08-09'), response);
  assert.deepEqual(events, ['save', 'publish']);
  assert.equal(getLogs()['2026-08-09'].notes, 'Keep this note');
  assert.equal(getLogs()[date], undefined);
});

test('quota failures reject daily-note submission without publishing a confirmation', async () => {
  const error = new StoragePersistenceError();
  const { process, events, getLogs } = harness(analysis(), error);
  await assert.rejects(process('Keep this draft'), value => value === error);
  assert.deepEqual(events, ['save']);
  assert.deepEqual(getLogs(), {});
});

test('unsuccessful analysis rejects submission so the input can retain its draft', async () => {
  const { process, events } = harness({ ...analysis(), success: false, error: 'Analysis failed' });
  await assert.rejects(process('Keep this draft'), /Analysis failed/);
  assert.deepEqual(events, []);
});

test('missing analysis payload is not reported as a saved note', async () => {
  const { process, events } = harness({ success: true, data: null });
  await assert.rejects(process('Keep this draft'), /analizar la nota/);
  assert.deepEqual(events, []);
});
