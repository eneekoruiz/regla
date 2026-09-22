import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCycleStatistics, detectCycleRecovery, calculateUpcomingMilestones } from '../../src/services/predictiveEngine.ts';
import { chronicleRecoveredPeriod } from '../../src/services/recoveryChronicler.ts';
import { getDefaultSettings } from '../../src/utils/storage.ts';

const settings = { ...getDefaultSettings(), lastPeriodStartDate: '2026-07-01' };
const stats = calculateCycleStatistics({}, settings, '2026-08-20');

test('recovery uses strict 1.5 times cycle threshold and does not fabricate observations', () => {
  assert.equal(detectCycleRecovery(stats, '2026-08-12'), null);
  assert.deepEqual(detectCycleRecovery(stats, '2026-08-13'), { anchor: '2026-07-01', startDate: '2026-07-29', endDate: '2026-08-02' });
  for (const reproductiveStatus of ['pregnancy', 'postpartum', 'menopause']) assert.equal(detectCycleRecovery({ ...stats, reproductiveStatus }, '2026-08-20'), null);
  assert.equal(detectCycleRecovery({ ...stats, isHormonalBirthControl: true }, '2026-08-20'), null);
  assert.equal(detectCycleRecovery({ ...stats, lastVerifiedPeriodStart: '' }, '2026-08-20'), null);
});

test('confirmation preserves observations without inferring flow and recalculates predictions', () => {
  const original = { '2026-07-29': { date: '2026-07-29', isPeriod: false, notes: 'Mi nota', symptoms: [{ id: 'headache', name: 'Dolor de cabeza', category: 'pain' }], bbt: 36.5 } };
  const result = chronicleRecoveredPeriod(original, '2026-07-29', '2026-08-02', '2026-08-20');
  assert.equal(Object.keys(result).length, 5);
  assert.equal(original['2026-07-29'].isPeriod, false);
  assert.equal(result['2026-07-29'].isCycleStart, true);
  assert.equal(result['2026-07-30'].isCycleStart, false);
  assert.equal(result['2026-07-29'].flow, undefined);
  assert.equal(result['2026-07-29'].bbt, 36.5);
  assert.match(result['2026-07-29'].notes, /^Mi nota\nRegla recuperada/);
  assert.deepEqual(result['2026-07-29'].symptoms, original['2026-07-29'].symptoms);
  const recalculated = calculateCycleStatistics(result, settings, '2026-08-20');
  assert.equal(recalculated.lastVerifiedPeriodStart, '2026-07-29');
  assert.equal(detectCycleRecovery(recalculated, '2026-08-20'), null);
  assert.equal(calculateUpcomingMilestones(recalculated, '2026-08-20').nextPeriodStartDate, '2026-08-26');
  const repeated = chronicleRecoveredPeriod(result, '2026-07-29', '2026-08-02', '2026-08-20');
  assert.equal(repeated['2026-07-29'].notes, result['2026-07-29'].notes);
});

test('recovery rejects invalid, future, reversed, excessive and conflicting ranges atomically', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-02'], ['2026-08-21', '2026-08-22'], ['2026-08-02', '2026-08-01'], ['2026-07-01', '2026-08-02']]) {
    assert.throws(() => chronicleRecoveredPeriod({}, start, end, '2026-08-20'));
  }
  const original = { '2026-07-30': { date: '2026-07-30', isPeriod: false, flow: 'spotting', symptoms: [] } };
  assert.throws(() => chronicleRecoveredPeriod(original, '2026-07-29', '2026-08-02', '2026-08-20'));
  assert.equal(Object.keys(original).length, 1);
  const overlapping = { '2026-07-28': { date: '2026-07-28', isPeriod: true, isCycleStart: true, symptoms: [] }, '2026-07-29': { date: '2026-07-29', isPeriod: true, symptoms: [] } };
  assert.throws(() => chronicleRecoveredPeriod(overlapping, '2026-07-29', '2026-08-02', '2026-08-20'));
  assert.throws(() => chronicleRecoveredPeriod(overlapping, '2026-07-27', '2026-08-02', '2026-08-20'));
});

test('multiple omitted cycles are proposed individually, never bulk inferred', () => {
  const first = detectCycleRecovery(stats, '2026-10-01');
  const recorded = chronicleRecoveredPeriod({}, first.startDate, first.endDate, '2026-10-01');
  assert.equal(Object.keys(recorded).length, 5);
  const second = detectCycleRecovery(calculateCycleStatistics(recorded, settings, '2026-10-01'), '2026-10-01');
  assert.equal(second.startDate, '2026-08-26');
});
