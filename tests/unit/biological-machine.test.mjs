import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biologicalReducer, INITIAL_BIOLOGICAL_STATE } from '../../src/services/biologicalMachine.ts';
import { calculateCycleStatistics, predictDayStatus, calculateUpcomingMilestones } from '../../src/services/predictiveEngine.ts';
import { getDefaultSettings } from '../../src/utils/storage.ts';
import { generateChatResponse } from '../../src/services/aiAgent.ts';
import { getCycleDayInfo } from '../../src/utils/cycleCalculator.ts';
import { rankSymptoms } from '../../src/services/symptomPreferences.ts';
import { updateBleedingLog } from '../../src/utils/dailyLog.ts';

test('all combinations of evidence produce mutually exclusive biological states', () => {
  for (const reproductiveStatus of ['cycling', 'pregnancy', 'postpartum', 'menopause'])
  for (const hormonal of [true, false]) for (const uncertain of [true, false])
  for (const hasAnchor of [true, false]) for (const observedPeriod of [true, false, undefined])
  for (let day = 0; day <= 130; day++) {
    const state = biologicalReducer(INITIAL_BIOLOGICAL_STATE, { type: 'RECONCILE', evidence: { reproductiveStatus, hormonal, uncertain, hasAnchor, observedPeriod, estimatedPeriod: day <= 5, day, ovulationDay: 14 } });
    assert.ok(!(state.isPeriod && state.isFertileWindow));
    assert.ok(!(state.isPeriod && state.isOvulationDay));
    if (state.isOvulationDay) assert.equal(state.value, 'ovulation');
    if (reproductiveStatus !== 'cycling') { assert.equal(state.value, reproductiveStatus); assert.equal(state.isFertileWindow, false); }
    if (uncertain && observedPeriod !== true) assert.equal(state.isOvulationDay, false);
  }
});

test('a long overdue cycle never invents a period or moves its expected start', () => {
  const settings = { ...getDefaultSettings(), lastPeriodStartDate: '2026-01-01' };
  const stats = calculateCycleStatistics({}, settings);
  const day = predictDayStatus('2026-06-01', stats, {});
  assert.equal(day.dayOfCycle, 152);
  assert.equal(day.phase, 'unknown');
  assert.equal(day.isPeriod, false);
  assert.equal(calculateUpcomingMilestones(stats, '2026-06-01').nextPeriodStartDate, '2026-01-29');
});

test('irregularity is respected after several cycles, not just during onboarding', () => {
  const logs = Object.fromEntries(['2026-01-01', '2026-02-01', '2026-03-10', '2026-04-10'].map(date => [date, { date, isPeriod: true, isCycleStart: true, symptoms: [] }]));
  const settings = { ...getDefaultSettings(), cycleProfile: { regularity: 'irregular', birthControl: 'none', typicalCramps: 'mild' } };
  const stats = calculateCycleStatistics(logs, settings);
  assert.equal(stats.isIrregular, true);
  assert.equal(stats.totalCyclesAnalyzed, 3);
  assert.equal(predictDayStatus('2026-04-23', stats, logs).phase, 'unknown');
  assert.equal(calculateUpcomingMilestones(stats, '2026-04-15').nextOvulationDate, '');
});

test('spotting cannot become a menstrual state even with inconsistent legacy flags', () => {
  const logs = { '2026-06-01': { date: '2026-06-01', isPeriod: true, flow: 'spotting', symptoms: [] } };
  const stats = calculateCycleStatistics(logs, getDefaultSettings());
  assert.equal(predictDayStatus('2026-06-01', stats, logs).isPeriod, false);
});

test('pregnancy and hormonal profiles pause milestones while preserving observed bleeding', () => {
  for (const patch of [{ reproductiveStatus: 'pregnancy' }, { cycleProfile: { regularity: 'regular', birthControl: 'pill', typicalCramps: 'mild' } }]) {
    const settings = { ...getDefaultSettings(), lastPeriodStartDate: '2026-06-01', ...patch };
    const logs = { '2026-06-05': { date: '2026-06-05', isPeriod: true, flow: 'heavy', symptoms: [] } };
    const stats = calculateCycleStatistics(logs, settings);
    const prediction = predictDayStatus('2026-06-05', stats, logs);
    assert.equal(prediction.isPeriod, false);
    assert.equal(prediction.flow, 'heavy');
    assert.equal(calculateUpcomingMilestones(stats, '2026-06-05').nextPeriodStartDate, '');
    assert.equal(logs['2026-06-05'].isPeriod, true);
  }
});

test('Confidente uses the selected day, symptoms and irregular profile locally', async () => {
  const settings = { ...getDefaultSettings(), lastPeriodStartDate: '2026-06-01', hasPCOS: true };
  const logs = { '2026-06-10': { date: '2026-06-10', isPeriod: false, symptoms: [{ id: 'fatigue', name: 'Cansancio', category: 'energy', emoji: '' }] } };
  const result = await generateChatResponse('Consejos para mi fase de hoy', [], { settings, stats: calculateCycleStatistics(logs, settings), dayInfo: getCycleDayInfo('2026-06-10', '2026-06-10', settings, logs) });
  assert.match(result.text, /2026-06-10/);
  assert.match(result.text, /No calculamos un día de ovulación/);
  assert.match(result.text, /Cansancio/);
});

test('symptom favourites are derived from this history without mutating the catalogue', () => {
  const a = { id: 'a', name: 'A', category: 'pain', emoji: '' }, b = { ...a, id: 'b', name: 'B' };
  const catalog = [a, b];
  assert.deepEqual(rankSymptoms(catalog, { d: { symptoms: [b] } }).map(s => s.id), ['b', 'a']);
  assert.deepEqual(catalog.map(s => s.id), ['a', 'b']);
  assert.deepEqual(rankSymptoms(catalog, {}).map(s => s.id), ['a', 'b']);
});

test('removing or correcting irregular bleeding clears stale flags but preserves unrelated symptoms', () => {
  const log = { date: '2026-06-01', isPeriod: false, isIrregularBleeding: true, isCycleStart: true, flow: 'heavy', notes: 'Keep', symptoms: [{ id: 'irregular_bleeding', name: 'Irregular', category: 'flow', emoji: '' }, { id: 'fatigue', name: 'Fatigue', category: 'energy', emoji: '' }] };
  const removed = updateBleedingLog(log);
  assert.equal(removed.isIrregularBleeding, false);
  assert.equal(removed.isCycleStart, false);
  assert.equal(removed.flow, undefined);
  assert.equal(removed.notes, 'Keep');
  assert.deepEqual(removed.symptoms.map(s => s.id), ['fatigue']);
  const corrected = updateBleedingLog(log, { flow: 'light', isCycleStart: true, isIrregular: false });
  assert.equal(corrected.isPeriod, true);
  assert.equal(corrected.isCycleStart, true);
  assert.equal(corrected.isIrregularBleeding, false);
  assert.equal(updateBleedingLog(log, { flow: 'spotting', isCycleStart: true, isIrregular: false }).isCycleStart, false);
  assert.equal(log.isIrregularBleeding, true);
});

test('boundary cycle settings produce matching ovulation in milestones and calendar', () => {
  const stats = calculateCycleStatistics({}, { ...getDefaultSettings(), lastPeriodStartDate: '2026-06-01' });
  Object.assign(stats, { estimatedCycleLength: 15, estimatedPeriodLength: 30, lutealPhaseLength: 30 });
  const date = calculateUpcomingMilestones(stats, '2026-06-01').nextOvulationDate;
  assert.equal(predictDayStatus(date, stats, {}).isOvulationDay, true);
});
