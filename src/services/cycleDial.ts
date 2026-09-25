import type { DailyLog } from '../types/cycle';
import type { CycleStatistics, PredictedDateInfo } from '../types/prediction';
import type { CycleSnapshot } from './cycleSnapshot';
import { predictDayStatus } from './predictiveEngine';
import { diffDays, parseDateKey } from '../utils/dateKey';
import { shiftDateKey } from '../utils/dailyLog';

/**
 * Modelo de la gota del diario: el contorno es el ciclo completo y sobre él
 * se marcan los días de regla, los días fértiles, la ovulación y el día
 * consultado. El interior se llena a medida que avanza el ciclo.
 *
 * Reglas de lectura que la interfaz mantiene siempre iguales:
 * - La cifra central responde siempre a la misma pregunta: ¿cuándo me baja?
 *   (durante la regla, qué día de regla es; con retraso, cuántos días).
 * - Rosa = regla, ámbar = días fértiles, ✦ = ovulación, punto blanco = el día.
 * - La leyenda muestra siempre lo actual o lo próximo.
 */

export type DialTone = 'period' | 'fertile' | 'ovulation' | 'neutral';

/** Rango de días del ciclo, ambos incluidos (el día 1 es el inicio de la regla). */
export interface DayRange {
  start: number;
  end: number;
}

export interface DialCenter {
  value: string;
  caption: string;
  /** Línea discreta bajo la cifra: la fecha que responde a la pregunta central. */
  note?: string;
}

export interface DialFact {
  kind: 'period' | 'fertile' | 'ovulation';
  label: string;
  value: string;
}

export interface CycleDial {
  /** Fecha (YYYY-MM-DD) del día 1 del ciclo dibujado. */
  startDate: string;
  /** Días que representa el contorno completo. */
  length: number;
  /** Día marcado sobre el contorno (1..length). */
  day: number;
  /** La regla esperada no ha llegado: el marcador descansa en la punta. */
  isLate: boolean;
  tone: DialTone;
  period: DayRange | null;
  fertile: DayRange | null;
  ovulationDay: number | null;
  center: DialCenter;
  /** Próximas fechas clave; se leen en el resumen accesible y al recorrer la gota. */
  facts: DialFact[];
  /** Descripción completa para lectores de pantalla. */
  summary: string;
}

export interface DialPhase {
  label: string;
  tone: DialTone;
}

/** Lo que se muestra al recorrer la gota sobre un día concreto. */
export interface DialDayDetail {
  day: number;
  dateKey: string;
  /** "mié 30 sep" */
  dateLabel: string;
  phase: DialPhase;
  center: DialCenter;
  /** Nivel de llenado de la gota para ese día (0 vacía, 1 llena). */
  fill: number;
  /** Frase completa para lectores de pantalla. */
  summary: string;
}

export type DayStatus = Pick<PredictedDateInfo, 'isPeriod' | 'isFertileWindow' | 'isOvulationDay'>;
export type DayStatusResolver = (dateKey: string) => DayStatus;

export interface CycleDialSource {
  snapshot: CycleSnapshot;
  selectedDate: string;
  statusOf: DayStatusResolver;
  /** Duración real cuando la fecha pertenece a un ciclo ya cerrado. */
  closedCycleLength?: number;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Mismo criterio que el calendario: la previsión, más cualquier regla registrada a mano. */
export function createDayStatusResolver(stats: CycleStatistics, logs: Record<string, DailyLog>): DayStatusResolver {
  return dateKey => {
    const prediction = predictDayStatus(dateKey, stats, logs);
    return { ...prediction, isPeriod: prediction.isPeriod || Boolean(logs[dateKey]?.isPeriod) };
  };
}

/** Si la fecha cae en un ciclo ya cerrado por una regla posterior, su duración real. */
export function closedCycleLengthFor(stats: CycleStatistics, dateKey: string): number | undefined {
  const cycle = stats.historicalCycles?.find(entry => entry.startDate <= dateKey && Boolean(entry.endDate) && dateKey < (entry.endDate ?? ''));
  return cycle?.endDate ? diffDays(parseDateKey(cycle.startDate), parseDateKey(cycle.endDate)) : undefined;
}

function shortDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "mié 30 sep" */
export function weekdayDateLabel(dateKey: string): string {
  return `${WEEKDAYS[parseDateKey(dateKey).getDay()]} ${shortDate(dateKey)}`;
}

function shortRange(fromKey: string, toKey: string): string {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (from.getMonth() === to.getMonth()) return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]}`;
  return `${shortDate(fromKey)} – ${shortDate(toKey)}`;
}

const plural = (count: number, singular: string, pluralForm: string) => (count === 1 ? singular : pluralForm);
const inRange = (range: DayRange | null, day: number) => Boolean(range && day >= range.start && day <= range.end);
const joinCenter = ({ value, caption, note }: DialCenter) => [value, caption, note].filter(Boolean).join(' ');

function firstRun(flags: boolean[]): DayRange | null {
  const start = flags.indexOf(true);
  if (start < 0) return null;
  let end = start;
  while (end + 1 < flags.length && flags[end + 1]) end++;
  return { start: start + 1, end: end + 1 };
}

interface FactContext {
  snapshot: CycleSnapshot;
  selectedDate: string;
  startDate: string;
  length: number;
  day: number;
  isLate: boolean;
}

function toneFor(snapshot: CycleSnapshot, isLate: boolean, status: DayStatus | undefined): DialTone {
  if (snapshot.isPeriodDay) return 'period';
  if (isLate || !status) return 'neutral';
  if (status.isOvulationDay) return 'ovulation';
  return status.isFertileWindow ? 'fertile' : 'neutral';
}

function centerFor({ snapshot, selectedDate, startDate, length }: FactContext, lateDays: number | null, period: DayRange | null): DialCenter {
  if (lateDays !== null) {
    if (lateDays === 0) return { value: 'Hoy', caption: 'regla prevista' };
    const expected = shortDate(shiftDateKey(startDate, length));
    return { value: `+${lateDays}`, caption: plural(lateDays, 'día de retraso', 'días de retraso'), note: `prevista el ${expected}` };
  }
  if (snapshot.isPeriodDay) {
    // Durante la regla la pregunta es cuánto queda de ella (el día ya lo indica el rótulo superior).
    const lastDay = Math.max(period?.end ?? snapshot.periodLength, snapshot.cycleDay);
    const remaining = lastDay - snapshot.cycleDay;
    if (remaining === 0) return { value: 'Hoy', caption: snapshot.isFuture ? 'último día de regla previsto' : 'último día de regla' };
    return {
      value: String(remaining),
      caption: plural(remaining, 'día más de regla', 'días más de regla'),
      note: `hasta el ${weekdayDateLabel(shiftDateKey(startDate, lastDay - 1))}`,
    };
  }
  return {
    value: String(snapshot.daysToNext),
    caption: plural(snapshot.daysToNext, 'día para tu regla', 'días para tu regla'),
    note: weekdayDateLabel(shiftDateKey(selectedDate, snapshot.daysToNext)),
  };
}

function periodFact({ snapshot, selectedDate, startDate, length, isLate }: FactContext, period: DayRange | null): DialFact {
  if (isLate) {
    const expected = shiftDateKey(startDate, length);
    return { kind: 'period', label: 'Regla prevista', value: expected === selectedDate ? 'hoy' : shortDate(expected) };
  }
  if (snapshot.isPeriodDay && period) {
    const end = shiftDateKey(startDate, Math.max(period.end, snapshot.cycleDay) - 1);
    return { kind: 'period', label: 'Fin de regla', value: end === selectedDate ? 'hoy' : `~${shortDate(end)}` };
  }
  return { kind: 'period', label: 'Próxima regla', value: shortDate(shiftDateKey(selectedDate, snapshot.daysToNext)) };
}

function fertileFact({ startDate, length, day, isLate }: FactContext, fertile: DayRange | null): DialFact {
  const label = 'Días fértiles';
  if (!fertile) return { kind: 'fertile', label, value: 'Sin estimación' };
  if (isLate) return { kind: 'fertile', label, value: 'Tras tu regla' };
  if (day > fertile.end) {
    return { kind: 'fertile', label, value: shortRange(shiftDateKey(startDate, length + fertile.start - 1), shiftDateKey(startDate, length + fertile.end - 1)) };
  }
  const endKey = shiftDateKey(startDate, fertile.end - 1);
  if (day < fertile.start) return { kind: 'fertile', label, value: shortRange(shiftDateKey(startDate, fertile.start - 1), endKey) };
  return { kind: 'fertile', label, value: day === fertile.end ? 'hasta hoy' : `hasta ${shortDate(endKey)}` };
}

function ovulationFact({ startDate, length, day, isLate }: FactContext, ovulationDay: number | null): DialFact {
  const label = 'Ovulación';
  if (ovulationDay === null || isLate) return { kind: 'ovulation', label, value: '—' };
  if (day === ovulationDay) return { kind: 'ovulation', label, value: 'hoy' };
  const cycleOffset = day < ovulationDay ? 0 : length;
  return { kind: 'ovulation', label, value: shortDate(shiftDateKey(startDate, cycleOffset + ovulationDay - 1)) };
}

export function buildCycleDial({ snapshot, selectedDate, statusOf, closedCycleLength }: CycleDialSource): CycleDial {
  const cycleDay = Math.max(1, snapshot.cycleDay);
  const startDate = shiftDateKey(selectedDate, -(cycleDay - 1));
  const length = Math.max(1, closedCycleLength ?? snapshot.cycleLength);
  const days = Array.from({ length }, (_, index) => statusOf(shiftDateKey(startDate, index)));
  const isLate = !snapshot.isPeriodDay && cycleDay > length;
  const day = Math.min(cycleDay, length);
  const period = firstRun(days.map(status => status.isPeriod));
  const fertile = firstRun(days.map(status => status.isFertileWindow));
  const ovulationIndex = days.findIndex(status => status.isOvulationDay);
  const ovulationDay = ovulationIndex >= 0 ? ovulationIndex + 1 : null;

  const context: FactContext = { snapshot, selectedDate, startDate, length, day, isLate };
  const center = centerFor(context, isLate ? cycleDay - 1 - length : null, period);
  const facts = [periodFact(context, period), fertileFact(context, fertile), ovulationFact(context, ovulationDay)];
  const position = isLate ? `Día ${cycleDay}, más largo que tu ciclo habitual de ${length} días` : `Día ${cycleDay} de ${length}`;

  return {
    startDate,
    length,
    day,
    isLate,
    tone: toneFor(snapshot, isLate, days[day - 1]),
    period,
    fertile,
    ovulationDay,
    center,
    facts,
    summary: `${position}. ${joinCenter(center)}. ${facts.map(fact => `${fact.label}: ${fact.value}`).join('. ')}.`,
  };
}

function phaseOnDay(dial: CycleDial, day: number): DialPhase {
  if (inRange(dial.period, day)) return { label: 'Regla', tone: 'period' };
  if (dial.ovulationDay === day) return { label: 'Ovulación estimada', tone: 'ovulation' };
  if (!dial.fertile) return { label: 'Fase sin estimar', tone: 'neutral' };
  if (inRange(dial.fertile, day)) return { label: 'Días fértiles', tone: 'fertile' };
  return { label: day < dial.fertile.start ? 'Fase folicular' : 'Fase lútea', tone: 'neutral' };
}

/**
 * La gota se llena a medida que avanza el ciclo: casi vacía al empezar la
 * regla, casi llena justo antes de la siguiente y rebosante con retraso.
 */
export function fillLevel(dial: CycleDial, day: number): number {
  if (dial.isLate && day >= dial.length) return 1;
  return Math.min(1, Math.max(0, (day - 0.5) / dial.length));
}

function periodDayCenter(remaining: number): DialCenter {
  if (remaining <= 0) return { value: 'Último', caption: 'día de regla' };
  return { value: String(remaining), caption: plural(remaining, 'día más de regla', 'días más de regla') };
}

export function describeDialDay(dial: CycleDial, requestedDay: number): DialDayDetail {
  const day = Math.min(dial.length, Math.max(1, Math.round(requestedDay)));
  const dateKey = shiftDateKey(dial.startDate, day - 1);
  const dateLabel = weekdayDateLabel(dateKey);
  const phase = phaseOnDay(dial, day);
  const daysToPeriod = dial.length - day + 1;
  const center = phase.tone === 'period' && dial.period
    ? periodDayCenter(dial.period.end - day)
    : { value: String(daysToPeriod), caption: plural(daysToPeriod, 'día para la regla', 'días para la regla') };
  return {
    day,
    dateKey,
    dateLabel,
    phase,
    center,
    fill: fillLevel(dial, day),
    summary: `${dateLabel}, día ${day} del ciclo. ${phase.label}. ${joinCenter(center)}.`,
  };
}
