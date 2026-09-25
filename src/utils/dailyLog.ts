import type { CervicalMucusType, DailyLog, FlowIntensity, SymptomItem } from '../types/cycle';
import { formatDateKey, parseDateKey } from './dateKey';

/** Fecha desplazada `days` días (negativo hacia atrás), en formato YYYY-MM-DD. */
export function shiftDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/** Un día cuenta como registrado en cuanto guarda cualquier observación de la usuaria. */
export function hasDayEntries(log: DailyLog | undefined): boolean {
  if (!log) return false;
  return Boolean(
    log.isPeriod
    || log.isIrregularBleeding
    || log.symptoms?.length
    || log.notes
    || (log.intimacyLog && log.intimacyLog.activity !== 'none')
    || log.medications?.some(medication => medication.taken)
    || log.bbt !== undefined
    || (log.intimacy !== undefined && log.intimacy !== 'none')
    || log.quizResults?.length
  );
}

/**
 * ¿La usuaria ya usaba el diario ese día o antes? Evita reclamar "ayer sin
 * registrar" a quien acaba de empezar hoy (aunque haya anotado una regla
 * antigua): cuenta cuándo se guardó cada registro, no la fecha que describe.
 */
export function hasActivityOnOrBefore(logs: Record<string, DailyLog>, dateKey: string): boolean {
  return Object.values(logs).some(log => {
    const savedOn = log.recordedAt ? formatDateKey(new Date(log.recordedAt)) : '';
    return (savedOn || log.date) <= dateKey;
  });
}

/**
 * ¿Debe marcarse "primer día de un nuevo ciclo" por defecto al registrar
 * sangrado en `selectedDate`? Antes se comparaba con
 * `settings.lastPeriodStartDate`, que casi nunca coincide con un sangrado
 * nuevo todavía sin registrar — así que un día claramente atrasado (que
 * llevaba mucho sin período confirmado) se guardaba como continuación en
 * vez de como inicio, y avisos como "posible regla olvidada" seguían
 * apareciendo aunque la usuaria ya hubiera dicho que sí tuvo la regla.
 *
 * La señal fiable es mucho más simple: si el día anterior NO estaba
 * registrado como período, este es, por definición, el primer día de
 * sangrado — así que debe ser el inicio de ciclo por defecto. Si ya existe
 * un registro guardado para esta fecha, se respeta su elección anterior.
 */
export function computeDefaultCycleStart(selectedDate: string, logs: Record<string, DailyLog>): boolean {
  const existing = logs[selectedDate];
  if (existing?.isPeriod) return Boolean(existing.isCycleStart);
  const prevKey = shiftDateKey(selectedDate, -1);
  const previousDayIsPeriod = Boolean(prevKey && logs[prevKey]?.isPeriod);
  return !previousDayIsPeriod;
}

/** A correction clears obsolete flags and tags while preserving unrelated observations. */
export function updateBleedingLog(log: DailyLog, observation?: { flow: FlowIntensity; isCycleStart: boolean; isIrregular: boolean }): DailyLog {
  const isPeriod = Boolean(observation && !observation.isIrregular && observation.flow !== 'spotting');
  const symptoms: SymptomItem[] = log.symptoms.filter(s => s.id !== 'irregular_bleeding');
  if (observation?.isIrregular) symptoms.push({ id: 'irregular_bleeding', name: 'Sangrado irregular', category: 'flow', emoji: '💧' });
  return {
    ...log, isPeriod, flow: observation?.flow, isCycleStart: isPeriod && Boolean(observation?.isCycleStart),
    isIrregularBleeding: Boolean(observation?.isIrregular), symptoms, recordedAt: new Date().toISOString(),
  };
}

export function updateSymptothermalLog(log: DailyLog, options: { cervicalMucus?: CervicalMucusType; bbt?: number }): DailyLog {
  // An omitted field is unchanged; an explicit undefined clears every stored copy.
  const hasTemperature = Object.hasOwn(options, 'bbt');
  return {
    ...log,
    cervicalMucus: Object.hasOwn(options, 'cervicalMucus') ? options.cervicalMucus : log.cervicalMucus,
    bbt: hasTemperature ? options.bbt : log.bbt,
    ...(hasTemperature && log.biomarkers ? { biomarkers: { ...log.biomarkers, bbt: options.bbt } } : {}),
    recordedAt: new Date().toISOString()
  };
}
