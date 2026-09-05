import type { CycleDayInfo, CyclePhase, DailyLog, UserSettings } from '../types/cycle';
import { calculateCycleStatistics, predictDayStatus } from '../services/predictiveEngine';
import { isDateKey } from './dateKey';

export const SPANISH_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const SPANISH_MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const SPANISH_MONTHS_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const PHASE_NAMES: Record<CyclePhase, string> = {
  menstrual: 'Fase Menstrual',
  follicular: 'Fase Folicular',
  ovulation: 'Fase Ovulatoria',
  luteal: 'Fase Lútea',
};

export const PHASE_COLORS: Record<CyclePhase, { bg: string; text: string; ring: string; lightBg: string }> = {
  menstrual: {
    bg: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-400/40',
    lightBg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  follicular: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-400/40',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  ovulation: {
    bg: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-400/40',
    lightBg: 'bg-amber-50 dark:bg-amber-950/30'
  },
  luteal: {
    bg: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'ring-purple-400/40',
    lightBg: 'bg-purple-50 dark:bg-purple-950/30'
  }
};

/**
 * Format a Date object into 'YYYY-MM-DD'
 */
export function formatDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse 'YYYY-MM-DD' into a local Date object without time offset bugs
 */
export function parseDateKey(dateStr: string): Date {
  if (!isDateKey(dateStr)) return new Date(Number.NaN);
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calculate difference in whole days between two dates (b - a)
 */
export function diffDays(dateA: Date, dateB: Date): number {
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.floor((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/**
 * Get comprehensive info for a specific date in the cycle using the adaptive predictive engine
 */
export function getCycleDayInfo(
  dateStr: string,
  selectedDateStr: string,
  settings: UserSettings,
  logs: Record<string, DailyLog>
): CycleDayInfo {
  const targetDate = parseDateKey(dateStr);
  const todayStr = formatDateKey(new Date());
  const isToday = dateStr === todayStr;
  const isSelected = dateStr === selectedDateStr;

  const dayOfWeekShort = SPANISH_DAYS_SHORT[targetDate.getDay()];
  const monthNameShort = SPANISH_MONTHS_SHORT[targetDate.getMonth()];
  const monthNameFull = SPANISH_MONTHS_FULL[targetDate.getMonth()];
  const dayOfMonth = targetDate.getDate();
  const year = targetDate.getFullYear();

  const userLog = logs[dateStr];

  // Run the adaptive predictive engine
  const stats = calculateCycleStatistics(logs, settings);
  const prediction = predictDayStatus(dateStr, stats, logs);

  return {
    date: dateStr,
    dateObj: targetDate,
    dayOfMonth,
    dayOfWeekShort,
    monthNameShort,
    monthNameFull,
    year,
    isToday,
    isSelected,
    dayOfCycle: prediction.dayOfCycle,
    phase: prediction.phase,
    phaseName: PHASE_NAMES[prediction.phase],
    phaseColor: PHASE_COLORS[prediction.phase].bg,
    isPeriod: prediction.isPeriod,
    flow: prediction.flow,
    isFertileWindow: prediction.isFertileWindow,
    isOvulationDay: prediction.isOvulationDay,
    symptoms: userLog?.symptoms || [],
    notes: userLog?.notes,
    hasLog: !!userLog
  };
}

/**
 * Generate a range of days (e.g. past 45 days to future 45 days) for timeline
 */
export function generateDaysRange(
  centerDateStr: string,
  selectedDateStr: string,
  daysBefore = 45,
  daysAfter = 45,
  settings: UserSettings,
  logs: Record<string, DailyLog>,
  todayStr = formatDateKey(new Date())
): CycleDayInfo[] {
  const centerDate = parseDateKey(centerDateStr);
  const days: CycleDayInfo[] = [];

  // Compute stats once for all timeline days for high performance
  const stats = calculateCycleStatistics(logs, settings);

  for (let i = -daysBefore; i <= daysAfter; i++) {
    const d = new Date(centerDate);
    d.setDate(centerDate.getDate() + i);
    const dateKey = formatDateKey(d);
    const isToday = dateKey === todayStr;
    const isSelected = dateKey === selectedDateStr;
    const dayOfWeekShort = SPANISH_DAYS_SHORT[d.getDay()];
    const monthNameShort = SPANISH_MONTHS_SHORT[d.getMonth()];
    const monthNameFull = SPANISH_MONTHS_FULL[d.getMonth()];
    const dayOfMonth = d.getDate();
    const year = d.getFullYear();

    const userLog = logs[dateKey];
    const prediction = predictDayStatus(dateKey, stats, logs);

    days.push({
      date: dateKey,
      dateObj: d,
      dayOfMonth,
      dayOfWeekShort,
      monthNameShort,
      monthNameFull,
      year,
      isToday,
      isSelected,
      dayOfCycle: prediction.dayOfCycle,
      phase: prediction.phase,
      phaseName: PHASE_NAMES[prediction.phase],
      phaseColor: PHASE_COLORS[prediction.phase].bg,
      isPeriod: prediction.isPeriod,
      flow: prediction.flow,
      isFertileWindow: prediction.isFertileWindow,
      isOvulationDay: prediction.isOvulationDay,
      symptoms: userLog?.symptoms || [],
      notes: userLog?.notes,
      hasLog: !!userLog
    });
  }

  return days;
}
