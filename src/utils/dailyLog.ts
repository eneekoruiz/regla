import type { CervicalMucusType, DailyLog } from '../types/cycle';

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
