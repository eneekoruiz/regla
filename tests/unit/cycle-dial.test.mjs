import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCycleStatistics, predictDayStatus } from '../../src/services/predictiveEngine.ts';
import { describeCycleDay, phaseBadgeFor } from '../../src/services/cycleSnapshot.ts';
import { buildCycleDial, createDayStatusResolver, describeDialDay, fillLevel, moodOnDay } from '../../src/services/cycleDial.ts';
import { describeHeadline } from '../../src/services/cycleHeadline.ts';
import { buildPhaseRing } from '../../src/services/phaseRing.ts';
import { createDropTrack } from '../../src/utils/dropGeometry.ts';
import { hasActivityOnOrBefore, hasDayEntries, shiftDateKey } from '../../src/utils/dailyLog.ts';
import { getDefaultSettings } from '../../src/utils/storage.ts';

// Ciclo de 28 días (regla 1-5, ovulación el 14, días fértiles 9-15) que empieza el 1 de julio de 2026.
const settings = { ...getDefaultSettings(), averageCycleLength: 28, averagePeriodLength: 5, lutealPhaseLength: 14, lastPeriodStartDate: '2026-07-01' };
const periodStart = { date: '2026-07-01', isPeriod: true, isCycleStart: true, flow: 'medium', symptoms: [], recordedAt: '2026-07-01T09:00:00.000Z' };

function scenario(today, extraLogs = {}, selected = today) {
  const logs = { '2026-07-01': periodStart, ...extraLogs };
  const stats = calculateCycleStatistics(logs, settings, today);
  const prediction = predictDayStatus(selected, stats, logs);
  const day = { ...prediction, date: selected, symptoms: [], hasLog: Boolean(logs[selected]) };
  const snapshot = describeCycleDay({ day, selectedDate: selected, todayDate: today, stats, settings, logs, hasEnoughData: true });
  const dial = buildCycleDial({ snapshot, selectedDate: selected, statusOf: createDayStatusResolver(stats, logs) });
  const hasAnyLog = hasDayEntries(logs[selected]);
  return { day, snapshot, dial, headline: describeHeadline(snapshot, dial, hasAnyLog) };
}

test('drop track: starts and ends at the tip and is symmetric around its lowest point', () => {
  const track = createDropTrack(100, 16, 68);
  const tip = track.pointAt(0);
  assert.deepEqual([Math.round(tip.x), Math.round(tip.y)], [100, 16]);
  assert.deepEqual(track.pointAt(1), track.pointAt(0));
  const bottom = track.pointAt(0.5);
  assert.ok(Math.abs(bottom.x - 100) < 0.5);
  assert.ok(Math.abs(bottom.y - (track.belly.center.y + 68)) < 0.5);
  const right = track.pointAt(0.2);
  const left = track.pointAt(0.8);
  assert.ok(right.x > 100 && left.x < 100, 'recorre la gota en sentido horario');
  assert.ok(Math.abs((right.x - 100) - (100 - left.x)) < 0.5);
  assert.ok(Math.abs(right.y - left.y) < 0.5);
  assert.match(track.outline, /^M 100 16 C .* A .* C .* Z$/);
  assert.ok(track.slice(0.3, 0.6).startsWith(`M ${Math.round(track.pointAt(0.3).x * 100) / 100}`));
});

test('drop track: the liquid level follows the volume, from the bottom to the tip', () => {
  const track = createDropTrack(100, 16, 68);
  const bottomY = track.belly.center.y + 68;
  assert.equal(track.levelAt(0), bottomY);
  assert.ok(Math.abs(track.levelAt(1) - 16) < 0.5, 'llena hasta la punta');
  const levels = [0.1, 0.25, 0.5, 0.75, 0.9].map(volume => track.levelAt(volume));
  levels.reduce((previous, level) => { assert.ok(level < previous, 'sube al llenarse'); return level; }, bottomY);
  // Por volumen, un octavo de la gota llega más alto que un octavo de su altura.
  assert.ok(bottomY - track.levelAt(0.125) > (bottomY - 16) * 0.125 * 1.2);
  // La mitad del volumen queda en el vientre, por debajo de su centro... pero no mucho.
  const half = track.levelAt(0.5);
  assert.ok(half > track.belly.center.y - 12 && half < track.belly.center.y + 20);
  assert.equal(track.levelAt(-1), bottomY);
  assert.ok(Math.abs(track.levelAt(2) - 16) < 0.5);
});

test('fertile window: the drop counts down to the period, the headline to ovulation', () => {
  const { snapshot, dial, headline } = scenario('2026-07-09');
  assert.equal(snapshot.cycleDay, 9);
  assert.equal(snapshot.daysToNext, 20);
  assert.deepEqual([dial.length, dial.day, dial.ovulationDay], [28, 9, 14]);
  assert.deepEqual(dial.period, { start: 1, end: 5 });
  assert.deepEqual(dial.fertile, { start: 9, end: 15 });
  assert.equal(dial.tone, 'fertile');
  assert.deepEqual(dial.center, { value: '20', caption: 'días para tu regla', note: 'mié 29 jul' });
  assert.deepEqual(headline, { title: 'Ovulación en 5 días', copy: 'Estás en tu ventana fértil, hasta el mié 15 jul' });
  assert.match(dial.summary, /^Día 9 de 28\. 20 días para tu regla/);
});

test('each phase gets its own differentiated headline', () => {
  assert.deepEqual(scenario('2026-07-07').headline, { title: 'Ventana fértil en 2 días', copy: 'Empieza el jue 9 jul' });
  assert.deepEqual(scenario('2026-07-14').headline, { title: 'Hoy es tu ovulación estimada', copy: 'Tu día más fértil del ciclo' });
  assert.deepEqual(scenario('2026-07-15').headline, { title: 'Último día fértil', copy: 'Ovulación estimada el mar 14 jul' });
  assert.deepEqual(scenario('2026-07-20').headline, { title: 'Próxima ventana fértil en 17 días', copy: 'Tu ventana fértil de este ciclo ya pasó' });
  const pastDay = scenario('2026-07-09', {}, '2026-07-05');
  assert.equal(pastDay.headline.title, 'Día 5 de tu ciclo');
  const badge = phaseBadgeFor(scenario('2026-07-09').day, scenario('2026-07-09').snapshot, 'Fase por determinar');
  assert.deepEqual(badge, { label: 'Ventana Fértil', tone: 'fertile' });
});

test('during the period the drop shows how much is left and the headline the next fertile window', () => {
  const secondDay = { date: '2026-07-02', isPeriod: true, flow: 'medium', symptoms: [], recordedAt: '2026-07-02T09:00:00.000Z' };
  const { snapshot, dial, headline } = scenario('2026-07-02', { '2026-07-02': secondDay });
  assert.equal(snapshot.isRecorded, true);
  assert.equal(dial.tone, 'period');
  assert.deepEqual(dial.center, { value: '3', caption: 'días más de regla', note: 'hasta el dom 5 jul' });
  assert.deepEqual(headline, { title: 'Ventana fértil en 7 días', copy: 'Flujo medio registrado' });
});

test('a late period parks the marker at the tip and counts the delay', () => {
  const dueToday = scenario('2026-07-29');
  assert.equal(dueToday.dial.isLate, true);
  assert.deepEqual(dueToday.dial.center, { value: 'Hoy', caption: 'regla prevista' });
  assert.equal(dueToday.headline.title, 'Hoy podría bajarte la regla');

  const late = scenario('2026-08-01');
  assert.equal(late.snapshot.awaitingPeriod, true);
  assert.deepEqual([late.dial.day, late.dial.length], [28, 28]);
  assert.deepEqual(late.dial.center, { value: '+3', caption: 'días de retraso', note: 'prevista el 29 jul' });
  assert.equal(late.headline.title, 'Tu regla se está retrasando');
  assert.equal(fillLevel(late.dial, 28), 1);
});

test('scrubbing describes any day and the drop fills up as the period approaches', () => {
  const { dial } = scenario('2026-07-09');
  const ovulation = describeDialDay(dial, 14);
  assert.deepEqual([ovulation.dateLabel, ovulation.phase.label, ovulation.center.value], ['mar 14 jul', 'Ovulación estimada', '15']);
  assert.deepEqual(describeDialDay(dial, 2).center, { value: '3', caption: 'días más de regla' });
  assert.deepEqual(describeDialDay(dial, 5).center, { value: 'Último', caption: 'día de regla' });
  assert.equal(describeDialDay(dial, 20).phase.label, 'Fase lútea');
  assert.equal(describeDialDay(dial, 99).day, 28, 'se limita al ciclo dibujado');
  assert.ok(fillLevel(dial, 1) < 0.05, 'casi vacía al empezar la regla');
  assert.ok(fillLevel(dial, 28) > 0.95, 'casi llena justo antes de la siguiente');
});

test('the drop avatar rests during the period, livens up when fertile and calms down afterwards', () => {
  const { dial } = scenario('2026-07-09');
  assert.deepEqual([2, 7, 10, 14, 20].map(day => moodOnDay(dial, day)), ['resting', 'calm', 'energetic', 'energetic', 'soft']);
});

test('phase ring: real-length phases around the whole cycle and where you are in it', () => {
  const { dial, snapshot } = scenario('2026-07-04');
  const ring = buildPhaseRing(dial, snapshot.cycleDay);
  assert.deepEqual(ring.segments.map(({ kind, start, end }) => `${kind} ${start}-${end}`), ['period 1-5', 'follicular 6-8', 'fertile 9-15', 'luteal 16-28']);
  assert.deepEqual([ring.kicker, ring.value, ring.caption], ['Regla', '4', 'de 28 días']);
  // Mientras se recorre la gota, el círculo marca el mismo día.
  assert.equal(buildPhaseRing(dial, snapshot.cycleDay, 14).kicker, 'Ovulación estimada');
  assert.equal(buildPhaseRing(dial, snapshot.cycleDay, 11).kicker, 'Ventana fértil');
  assert.equal(buildPhaseRing(dial, snapshot.cycleDay, 20).kicker, 'Fase lútea');
  assert.equal(buildPhaseRing(dial, snapshot.cycleDay, 7).kicker, 'Fase folicular');

  const late = scenario('2026-08-01');
  const lateRing = buildPhaseRing(late.dial, late.snapshot.cycleDay);
  assert.deepEqual([lateRing.isLate, lateRing.kicker, lateRing.value], [true, 'Retraso', String(late.snapshot.cycleDay)]);
});

test('daily entries, date shifting and first-day activity are detected consistently', () => {
  assert.equal(hasDayEntries(undefined), false);
  assert.equal(hasDayEntries({ date: '2026-07-09', isPeriod: false, symptoms: [] }), false);
  assert.equal(hasDayEntries({ date: '2026-07-09', isPeriod: false, symptoms: [], bbt: 36.5 }), true);
  assert.equal(hasDayEntries({ date: '2026-07-09', isPeriod: false, symptoms: [], intimacyLog: { activity: 'none' } }), false);
  assert.equal(shiftDateKey('2026-03-01', -1), '2026-02-28');
  const oldPeriodLoggedToday = { '2026-06-01': { date: '2026-06-01', isPeriod: true, symptoms: [], recordedAt: '2026-07-09T08:00:00.000' } };
  assert.equal(hasActivityOnOrBefore(oldPeriodLoggedToday, '2026-07-08'), false, 'quien empieza hoy no tiene "ayer" pendiente');
  assert.equal(hasActivityOnOrBefore(oldPeriodLoggedToday, '2026-07-09'), true);
});
