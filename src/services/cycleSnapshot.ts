import type { CycleDayInfo, DailyLog, FlowIntensity, UserSettings } from '../types/cycle';
import type { CycleStatistics } from '../types/prediction';
import { calculateUpcomingMilestones } from './predictiveEngine';
import { diffDays, isDateKey, parseDateKey } from '../utils/dateKey';

/** Margen tras el que un registro de regla ausente se considera "probablemente olvidado". */
const MISSED_PERIOD_GRACE_DAYS = 10;
const MISSED_PERIOD_MAX_CYCLES = 2.5;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;

const FLOW_NAMES: Record<FlowIntensity, string> = {
  spotting: 'manchado',
  light: 'ligero',
  medium: 'medio',
  heavy: 'abundante',
  very_heavy: 'muy abundante',
};

export interface CycleSnapshotInput {
  /** Información del día seleccionado (currentDayInfo). */
  day: CycleDayInfo;
  selectedDate: string;
  todayDate: string;
  stats: CycleStatistics;
  settings: UserSettings;
  logs: Record<string, DailyLog>;
  hasEnoughData: boolean;
}

/**
 * Estado derivado del día seleccionado que comparten la cabecera, la gota y
 * las acciones del diario. Es una función pura: misma entrada, misma salida.
 */
export interface CycleSnapshot {
  /** Hay al menos un inicio de regla conocido (aunque hoy no haya fase estimable). */
  hasHistory: boolean;
  hasCycle: boolean;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  cycleLength: number;
  periodLength: number;
  /** Día del ciclo mostrado (durante un retraso sigue contando: 31, 32…). */
  cycleDay: number;
  /** Días transcurridos desde el último inicio de regla verificado (solo hoy). */
  elapsedDays: number;
  /** Hoy ya se ha alcanzado o superado la fecha prevista sin regla registrada. */
  awaitingPeriod: boolean;
  isRecorded: boolean;
  isIrregular: boolean;
  isPeriodDay: boolean;
  /** Días que faltan para la próxima regla desde la fecha seleccionada (≥ 1). */
  daysToNext: number;
  remainingPeriodDays: number;
  /** Intensidad registrada en palabras ("medio", "abundante"…). */
  flowName: string;
  /** Hace tanto del último registro que probablemente se olvidó una regla entera. */
  likelyMissedPeriod: boolean;
}

export function describeCycleDay({ day, selectedDate, todayDate, stats, settings, logs, hasEnoughData }: CycleSnapshotInput): CycleSnapshot {
  const hasCycle = hasEnoughData && day.dayOfCycle > 0;
  const log = logs[selectedDate];
  const isRecorded = Boolean(log?.isPeriod);
  const isToday = selectedDate === todayDate;
  const isFuture = selectedDate > todayDate;
  const cycleLength = Math.max(1, Math.round(stats.estimatedCycleLength || settings.averageCycleLength || DEFAULT_CYCLE_LENGTH));
  const periodLength = Math.max(1, Math.round(stats.estimatedPeriodLength || settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH));

  const elapsedDays = hasCycle && isToday && isDateKey(stats.lastVerifiedPeriodStart)
    ? diffDays(parseDateKey(stats.lastVerifiedPeriodStart), parseDateKey(todayDate))
    : 0;
  const awaitingPeriod = hasCycle && elapsedDays >= cycleLength && !isRecorded && !isFuture;
  const cycleDay = cycleDayFor(hasCycle, awaitingPeriod, elapsedDays, day.dayOfCycle);

  const daysUntilNextPeriod = calculateUpcomingMilestones(stats, selectedDate).daysUntilNextPeriod;
  const daysToNext = daysUntilNextPeriod > 0 ? daysUntilNextPeriod : Math.max(1, cycleLength - cycleDay + 1);

  return {
    hasHistory: hasEnoughData,
    hasCycle,
    isPast: selectedDate < todayDate,
    isToday,
    isFuture,
    cycleLength,
    periodLength,
    cycleDay,
    elapsedDays,
    awaitingPeriod,
    isRecorded,
    isIrregular: Boolean(log?.isIrregularBleeding),
    isPeriodDay: Boolean(day.isPeriod || isRecorded),
    daysToNext,
    remainingPeriodDays: Math.max(0, periodLength - cycleDay),
    flowName: log?.flow ? FLOW_NAMES[log.flow] : 'activo',
    likelyMissedPeriod: isToday && hasCycle
      && elapsedDays > cycleLength + MISSED_PERIOD_GRACE_DAYS
      && elapsedDays < cycleLength * MISSED_PERIOD_MAX_CYCLES,
  };
}

function cycleDayFor(hasCycle: boolean, awaitingPeriod: boolean, elapsedDays: number, dayOfCycle: number): number {
  if (!hasCycle) return 0;
  return awaitingPeriod ? elapsedDays + 1 : dayOfCycle;
}

export type PhaseBadgeTone = 'fertile' | 'ovulation' | 'default';

/** Nombre corto de la fase para la píldora de la cabecera. */
export function phaseBadgeFor(day: CycleDayInfo, snapshot: CycleSnapshot, unknownLabel: string): { label: string; tone: PhaseBadgeTone } {
  if (snapshot.awaitingPeriod) return { label: 'Retraso', tone: 'default' };
  if (day.isPeriod) return { label: 'Fase Menstrual', tone: 'default' };
  if (day.isOvulationDay) return { label: 'Ovulación estimada', tone: 'ovulation' };
  if (day.isFertileWindow) return { label: 'Ventana Fértil', tone: 'fertile' };
  if (day.phase === 'follicular') return { label: 'Fase Folicular', tone: 'default' };
  if (day.phase === 'unknown') return { label: unknownLabel, tone: 'default' };
  return { label: 'Fase Lútea', tone: 'default' };
}
