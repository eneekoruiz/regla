import type { DailyLog } from '../types/cycle';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../utils/dateKey';

/** The Chronicler only fills dates the user explicitly confirms. */
export function chronicleRecoveredPeriod(logs: Record<string, DailyLog>, start: string, end: string, today: string): Record<string, DailyLog> {
  if (![start, end, today].every(isDateKey) || start > end || end > today || diffDays(parseDateKey(start), parseDateKey(end)) > 29) {
    throw new Error('Revisa las fechas: elige entre 1 y 30 días, hasta hoy.');
  }
  const next = { ...logs };
  const date = parseDateKey(start);
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - 1);
  if (logs[formatDateKey(previousDate)]?.isPeriod && !logs[start]?.isCycleStart) {
    throw new Error('El inicio coincide con una regla ya registrada. Ajusta las fechas para conservar su inicio.');
  }
  const recoveryNote = 'Regla recuperada: fechas aproximadas confirmadas por ti.';
  while (formatDateKey(date) <= end) {
    const key = formatDateKey(date);
    const existing = logs[key];
    if (existing?.isIrregularBleeding || existing?.flow === 'spotting' || (key !== start && existing?.isCycleStart)) {
      throw new Error('Estas fechas incluyen otro registro de sangrado. Ajusta el intervalo para conservarlo.');
    }
    next[key] = { ...existing, date: key, isPeriod: true, isCycleStart: key === start,
      symptoms: existing?.symptoms || [], recordedAt: new Date().toISOString(),
      notes: existing?.notes?.includes(recoveryNote) ? existing.notes : [existing?.notes, recoveryNote].filter(Boolean).join('\n') };
    date.setDate(date.getDate() + 1);
  }
  return next;
}
