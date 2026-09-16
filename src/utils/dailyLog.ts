import type { CervicalMucusType, DailyLog, FlowIntensity, SymptomItem } from '../types/cycle';

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
