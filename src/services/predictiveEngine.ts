import type { DailyLog, UserSettings } from '../types/cycle';
import type {
  CycleStatistics,
  HistoricalCycle,
  PredictedDateInfo,
  UpcomingMilestones
} from '../types/prediction';
import { biologicalReducer, INITIAL_BIOLOGICAL_STATE } from './biologicalMachine';
import { diffDays, formatDateKey, isDateKey, parseDateKey } from '../utils/dateKey';

const bounded = (value: number, fallback: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max ? value : fallback;

export interface CycleRecovery {
  anchor: string;
  startDate: string;
  endDate: string;
}

/** An invitation to confirm missing history, never an automatically recorded period. */
export function detectCycleRecovery(stats: CycleStatistics, today: string): CycleRecovery | null {
  if (!isDateKey(today) || !isDateKey(stats.lastVerifiedPeriodStart) ||
    (stats.reproductiveStatus && stats.reproductiveStatus !== 'cycling') || stats.isHormonalBirthControl) return null;
  const average = bounded(stats.estimatedCycleLength, 28, 15, 120);
  const anchor = parseDateKey(stats.lastVerifiedPeriodStart);
  if (diffDays(anchor, parseDateKey(today)) <= 1.5 * average) return null;
  const start = new Date(anchor);
  start.setDate(start.getDate() + Math.round(average));
  const end = new Date(start);
  end.setDate(end.getDate() + Math.round(bounded(stats.estimatedPeriodLength, 5, 1, 30)) - 1);
  return { anchor: stats.lastVerifiedPeriodStart, startDate: formatDateKey(start), endDate: formatDateKey(end) > today ? today : formatDateKey(end) };
}

interface PeriodCluster {
  startDate: string;
  endDate: string;
  bleedingDays: number;
}

/**
 * Extracts distinct bleeding clusters from the DailyLog entries
 */
export function extractPeriodClusters(
  logs: Record<string, DailyLog>,
  fallbackAnchor: string,
  fallbackPeriodLength = 5
): PeriodCluster[] {
  // 1. Gather all logged period dates
  const periodDates: string[] = [];

  for (const [dateKey, log] of Object.entries(logs)) {
    if (isDateKey(dateKey) && log.isPeriod && !log.isIrregularBleeding && log.flow !== 'spotting') {
      periodDates.push(dateKey);
    }
  }

  // If no period logs exist, synthesize the fallback anchor
  if (periodDates.length === 0) {
    if (!isDateKey(fallbackAnchor)) return [];
    const anchor = parseDateKey(fallbackAnchor);
    const end = new Date(anchor);
    end.setDate(anchor.getDate() + fallbackPeriodLength - 1);
    return [{
      startDate: fallbackAnchor,
      endDate: formatDateKey(end),
      bleedingDays: fallbackPeriodLength
    }];
  }

  // Sort ascending
  periodDates.sort();

  const clusters: PeriodCluster[] = [];
  let currentStart = periodDates[0];
  let currentEnd = periodDates[0];
  let daysCount = 1;

  for (let i = 1; i < periodDates.length; i++) {
    const prevDate = parseDateKey(periodDates[i - 1]);
    const currDate = parseDateKey(periodDates[i]);
    const gap = diffDays(prevDate, currDate);

    // If consecutive or with at most 1 day gap (e.g. spotting gap), consider same period
    if (gap <= 2 && !logs[periodDates[i]].isCycleStart) {
      currentEnd = periodDates[i];
      daysCount += 1;
    } else {
      clusters.push({
        startDate: currentStart,
        endDate: currentEnd,
        bleedingDays: daysCount
      });
      currentStart = periodDates[i];
      currentEnd = periodDates[i];
      daysCount = 1;
    }
  }

  clusters.push({
    startDate: currentStart,
    endDate: currentEnd,
    bleedingDays: daysCount
  });

  return clusters;
}

/**
 * Detects historical cycle lengths from period clusters
 */
export function detectHistoricalCycles(clusters: PeriodCluster[], hasPCOS: boolean = false): HistoricalCycle[] {
  const cycles: HistoricalCycle[] = [];
  const minDays = hasPCOS ? 15 : 20;
  const maxDays = hasPCOS ? 90 : 55;

  for (let i = 0; i < clusters.length - 1; i++) {
    const startA = parseDateKey(clusters[i].startDate);
    const startB = parseDateKey(clusters[i + 1].startDate);
    const lengthDays = diffDays(startA, startB);

    // Filter plausible cycle lengths according to health profile
    if (lengthDays >= minDays && lengthDays <= maxDays) {
      cycles.push({
        startDate: clusters[i].startDate,
        endDate: clusters[i + 1].startDate,
        lengthDays,
        periodLengthDays: clusters[i].bleedingDays
      });
    }
  }

  return cycles;
}

/**
 * Computes adaptive statistics using Recency-Weighted EWMA and variability
 */
export function calculateCycleStatistics(
  logs: Record<string, DailyLog>,
  settings: UserSettings,
  today = formatDateKey(new Date())
): CycleStatistics {
  const isPCOSModeActive = !!settings.hasPCOS || settings.cycleProfile?.regularity === 'pcos';
  const isIrregular = isPCOSModeActive || settings.cycleProfile?.regularity === 'irregular' || settings.regularityPreference === 'irregular';
  const reproductiveStatus = settings.reproductiveStatus || 'cycling';
  const birthControl = settings.cycleProfile?.birthControl || 'none';
  const isBirthControlPill = birthControl === 'pill';
  const isHormonalBirthControl = isBirthControlPill || birthControl === 'iud_hormonal' || birthControl === 'implant';
  const hasHighStress = settings.lifestyleProfile?.stressLevel === 'high';

  const defaultCycle = bounded(settings.averageCycleLength, 28, 15, 120);
  const defaultPeriod = Math.min(defaultCycle - 1, bounded(settings.averagePeriodLength, 5, 1, 30));
  const lutealPhaseLength = Math.min(defaultCycle - 1, bounded(settings.lutealPhaseLength, 14, 1, 30));
  const anchorLog = logs[settings.lastPeriodStartDate];
  const fallbackAnchor = isDateKey(settings.lastPeriodStartDate) && settings.lastPeriodStartDate <= today && (!anchorLog || (anchorLog.isPeriod && !anchorLog.isIrregularBleeding && anchorLog.flow !== 'spotting')) ? settings.lastPeriodStartDate : '';
  const recordedLogs = Object.fromEntries(Object.entries(logs).filter(([date]) => date <= today));
  const clusters = extractPeriodClusters(recordedLogs, fallbackAnchor, defaultPeriod);
  const cycles = detectHistoricalCycles(clusters, isIrregular);

  // Find verified period start: prioritize the most recent real period cluster logged by user
  let lastVerifiedPeriodStart = fallbackAnchor;
  if (clusters.length > 0) {
    const latestClusterStart = clusters[clusters.length - 1].startDate;
    if (!lastVerifiedPeriodStart || latestClusterStart >= lastVerifiedPeriodStart) {
      lastVerifiedPeriodStart = latestClusterStart;
    }
  }

  // Profile-driven insights
  const profileInsights: string[] = [];
  if (isPCOSModeActive) {
    profileInsights.push('Con ciclos irregulares, las fechas estimadas pueden variar más.');
  }
  if (isBirthControlPill) {
    profileInsights.push('Con anticoncepción hormonal no se muestra una ventana fértil calculada.');
  }
  if (hasHighStress) {
    profileInsights.push('Puedes registrar el estrés junto a tus síntomas para observar tendencias.');
  }

  // 0 Historical cycles recorded: Use base user configuration
  if (cycles.length === 0) {
    return {
      estimatedCycleLength: defaultCycle,
      estimatedPeriodLength: defaultPeriod,
      variabilityDays: isIrregular ? 6.0 : (isBirthControlPill ? 1.0 : 2.0),
      lutealPhaseLength,
      totalCyclesAnalyzed: 0,
      lastVerifiedPeriodStart,
      confidenceScore: lastVerifiedPeriodStart ? 0.6 : 0,
      isPCOSModeActive, isIrregular, reproductiveStatus,
      birthControl,
      isHormonalBirthControl,
      historicalCycles: [],
      delayTrendDescription: isPCOSModeActive
        ? 'Modo SOP activo: Algoritmo adaptado para variabilidad natural ampliada.'
        : (isBirthControlPill ? 'Con anticoncepción hormonal, registra el sangrado observado; no se calcula ovulación.' : 'Esperando registrar tu primer ciclo completo para calcular tendencias.'),
      insights: profileInsights
    };
  }

  // Calculate most recent cycle delay vs user average
  const lastCycle = cycles[cycles.length - 1];
  const lastCycleDelayDays = Math.round(lastCycle.lengthDays - defaultCycle);

  let delayTrendDescription: string | undefined = undefined;
  if (lastCycle.lengthDays > defaultCycle + 2) {
    delayTrendDescription = `Tu último ciclo fue ${lastCycle.lengthDays - defaultCycle} días más largo que tu media.`;
  } else if (lastCycle.lengthDays < defaultCycle - 2) {
    delayTrendDescription = `Tu último ciclo fue ${defaultCycle - lastCycle.lengthDays} días más corto que tu media.`;
  }

  // 1 Historical cycle: Blend 50/50 with user settings
  if (cycles.length === 1) {
    const estimatedCycleLength = Math.round((defaultCycle * 0.4 + cycles[0].lengthDays * 0.6) * 10) / 10;
    const estimatedPeriodLength = Math.max(2, Math.min(8, cycles[0].periodLengthDays));
    return {
      estimatedCycleLength,
      estimatedPeriodLength,
      variabilityDays: isIrregular ? 6.0 : 2.0,
      lutealPhaseLength,
      totalCyclesAnalyzed: 1,
      lastVerifiedPeriodStart,
      confidenceScore: 0.75,
      lastCycleDelayDays,
      delayTrendDescription,
      isPCOSModeActive, isIrregular, reproductiveStatus,
      birthControl,
      isHormonalBirthControl,
      historicalCycles: cycles,
      insights: ["¡Primer ciclo registrado! Analizando tu patrón..."]
    };
  }

  // 2+ historical cycles: robust outlier handling and recency weighting.
  const sortedLengths = [...cycles].map(c => c.lengthDays).sort((a, b) => a - b);
  const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)];

  // Robust outlier handling: isolated atypical cycles are down-weighted without
  // deleting history or presenting a clinical diagnosis.
  let outlierCount = 0;
  let calculationCycles = cycles;

  if (cycles.length >= 3 && !isIrregular) {
    const typical = cycles.filter(c => {
      const dev = Math.abs(c.lengthDays - medianLength);
      return dev <= 7;
    });

    if (typical.length >= 2) {
      outlierCount = cycles.length - typical.length;
      calculationCycles = typical;
    }
  }

  let weightedSum = 0;
  let weightTotal = 0;
  let periodWeightedSum = 0;
  let periodWeightTotal = 0;

  calculationCycles.forEach((c, idx) => {
    const weight = Math.pow(1.35, idx - calculationCycles.length + 1);
    weightedSum += c.lengthDays * weight;
    weightTotal += weight;

    if (c.periodLengthDays > 0) {
      periodWeightedSum += c.periodLengthDays * weight;
      periodWeightTotal += weight;
    }
  });

  const ewmaCycle = weightTotal > 0 ? weightedSum / weightTotal : defaultCycle;
  const ewmaPeriod = periodWeightTotal > 0 ? periodWeightedSum / periodWeightTotal : defaultPeriod;

  const blendWeight = Math.min(1.0, calculationCycles.length * 0.25);
  const estimatedCycleLength = Math.round(((1 - blendWeight) * defaultCycle + blendWeight * ewmaCycle) * 10) / 10;
  const estimatedPeriodLength = Math.round(((1 - blendWeight) * defaultPeriod + blendWeight * ewmaPeriod) * 10) / 10;

  const deviations = calculationCycles.map(c => Math.abs(c.lengthDays - estimatedCycleLength));
  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
  const variabilityDays = Math.round(avgDev * 10) / 10;
  const confidenceIntervalDays = Math.max(1, Math.round(variabilityDays * 1.15));

  const confidenceScore = Math.min(0.98, 0.65 + calculationCycles.length * 0.08);

  // Broad screening language only; these messages are not diagnoses.
  let irregularityAlert: CycleStatistics['irregularityAlert'];
  if (!isPCOSModeActive && calculationCycles.length >= 2) {
    if (variabilityDays >= 7) {
      irregularityAlert = {
        hasAlert: true,
        type: 'highly_variable',
        message: 'Variabilidad de ciclo superior a 7 días. Considera consultar a tu ginecóloga.'
      };
    } else if (lastCycle.lengthDays < 24) {
      irregularityAlert = {
        hasAlert: true,
        type: 'unusually_short',
        message: 'Tu último ciclo fue más corto que los anteriores. Si este cambio se repite o te preocupa, coméntalo en consulta.'
      };
    } else if (lastCycle.lengthDays > 38) {
      irregularityAlert = {
        hasAlert: true,
        type: 'unusually_long',
        message: 'Tu último ciclo fue más largo que los anteriores. Si este cambio se repite o te preocupa, coméntalo en consulta.'
      };
    }
  }

  // Generar Insights Dinámicos
  const insights: string[] = [];
  if (outlierCount > 0) {
    insights.push(`Se ha reducido el peso de ${outlierCount} ciclo atípico en la estimación. Sus registros se conservan en el historial.`);
  }
  if (variabilityDays <= 1.2) {
    insights.push("Los ciclos registrados tienen duraciones parecidas. Las próximas fechas siguen siendo estimaciones.");
  } else if (variabilityDays > 4) {
    insights.push("Las duraciones registradas varían. Si los cambios te preocupan, puedes llevar tu historial a una consulta.");
  }

  if (lutealPhaseLength > 14) {
    insights.push("La duración de fase lútea configurada es una referencia para el cálculo; no permite valorar la salud hormonal.");
  }

  if (cycles.length >= 3) {
    insights.push("Tus registros ayudan a ajustar las estimaciones. La precisión puede variar entre ciclos.");
  }

  return {
    estimatedCycleLength,
    estimatedPeriodLength,
    variabilityDays,
    confidenceIntervalDays,
    lutealPhaseLength,
    totalCyclesAnalyzed: cycles.length,
    outlierCyclesDetected: outlierCount,
    lastVerifiedPeriodStart,
    confidenceScore,
    lastCycleDelayDays,
    delayTrendDescription,
    isPCOSModeActive, isIrregular, reproductiveStatus,
    birthControl,
    isHormonalBirthControl,
    historicalCycles: cycles,
    irregularityAlert,
    scientificModelNote: 'Estimación de calendario basada en registros y duraciones configuradas. No es un modelo clínicamente validado ni confirma ovulación o fertilidad.',
    insights
  };
}

/**
 * Predicts the state and phase of any specific date in past, present or future
 */
export function predictDayStatus(
  targetDateStr: string,
  stats: CycleStatistics,
  logs: Record<string, DailyLog>
): PredictedDateInfo {
  const userLog = logs[targetDateStr];
  const cycleLen = Math.round(bounded(stats.estimatedCycleLength, 28, 15, 120));
  const periodLen = Math.min(cycleLen - 1, Math.round(bounded(stats.estimatedPeriodLength, 5, 1, 30)));
  const lutealLen = Math.min(cycleLen - 1, bounded(stats.lutealPhaseLength, 14, 1, 30));
  const valid = isDateKey(stats.lastVerifiedPeriodStart) && isDateKey(targetDateStr);
  const targetDate = parseDateKey(targetDateStr);
  const today = formatDateKey(new Date());
  const elapsed = valid ? diffDays(parseDateKey(stats.lastVerifiedPeriodStart), targetDate) : 0;
  const historicalCycle = stats.historicalCycles?.find(c => c.startDate <= targetDateStr && !!c.endDate && targetDateStr < c.endDate);
  const hasAnchor = valid && (elapsed >= 0 || !!historicalCycle);
  // A future projection may repeat; an ongoing observed cycle never restarts itself.
  const projected = targetDateStr > today;
  const cycleOffset = hasAnchor && projected ? Math.max(0, Math.floor(elapsed / cycleLen)) : 0;
  const dayOfCycle = !hasAnchor ? 0 : historicalCycle
    ? diffDays(parseDateKey(historicalCycle.startDate), targetDate) + 1
    : elapsed - cycleOffset * cycleLen + 1;
  const overdue = hasAnchor && !projected && !historicalCycle && elapsed >= cycleLen;
  const irregular = Boolean(stats.isIrregular || stats.isPCOSModeActive);
  const ovulationDay = Math.min(cycleLen, Math.max(periodLen + 1, Math.round(cycleLen - lutealLen)));
  const observedPeriod = userLog ? Boolean(userLog.isPeriod && !userLog.isIrregularBleeding && userLog.flow !== 'spotting') : undefined;
  const state = biologicalReducer(INITIAL_BIOLOGICAL_STATE, { type: 'RECONCILE', evidence: {
    reproductiveStatus: stats.reproductiveStatus, hormonal: Boolean(stats.isHormonalBirthControl),
    uncertain: irregular || overdue, hasAnchor, observedPeriod,
    estimatedPeriod: dayOfCycle >= 1 && dayOfCycle <= periodLen,
    day: dayOfCycle, ovulationDay,
  }});
  const active = !['pregnancy', 'postpartum', 'menopause', 'hormonal'].includes(state.value);
  return {
    date: targetDateStr, isHistorical: !!userLog, phase: state.value,
    isPeriod: state.isPeriod, isOvulationDay: state.isOvulationDay, isFertileWindow: state.isFertileWindow,
    flow: userLog?.flow, dayOfCycle: active ? dayOfCycle : 0, cycleNumberOffset: cycleOffset,
    confidence: !hasAnchor || state.value === 'unknown' || !active ? 0 : Math.max(0, Math.min(1, stats.confidenceScore * Math.pow(0.92, cycleOffset))),
  };
}


/**
 * Calculates next milestone dates for cycle management
 */
export function calculateUpcomingMilestones(
  stats: CycleStatistics,
  referenceDateStr: string
): UpcomingMilestones {
  if (!isDateKey(stats.lastVerifiedPeriodStart) || !isDateKey(referenceDateStr) || (stats.reproductiveStatus && stats.reproductiveStatus !== 'cycling') || stats.isHormonalBirthControl) {
    return { nextPeriodStartDate: '', nextPeriodEndDate: '', nextOvulationDate: '', nextFertileWindowStart: '', nextFertileWindowEnd: '', daysUntilNextPeriod: 0, daysUntilNextOvulation: 0 };
  }
  const refDate = parseDateKey(referenceDateStr);
  const anchorDate = parseDateKey(stats.lastVerifiedPeriodStart);
  const daysDiff = diffDays(anchorDate, refDate);

  const cycleLen = Math.round(bounded(stats.estimatedCycleLength, 28, 15, 120));
  const periodLen = Math.min(cycleLen - 1, Math.round(bounded(stats.estimatedPeriodLength, 5, 1, 30)));
  const lutealLen = Math.min(cycleLen - 1, bounded(stats.lutealPhaseLength, 14, 1, 30));
  // Keep the current expected period visible while it is overdue. Using ceil
  // here skipped directly to the following cycle after only one missed day.
  const cycleIndex = 1;

  // Next cycle start date
  const nextStart = new Date(anchorDate);
  nextStart.setDate(anchorDate.getDate() + Math.round(cycleIndex * cycleLen));

  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextStart.getDate() + Math.round(periodLen) - 1);

  // Next ovulation date
  const ovulationOffset = Math.min(cycleLen, Math.max(periodLen + 1, Math.round(cycleLen - lutealLen))) - 1;
  const ovulationCycle = Math.max(0, Math.ceil((daysDiff - ovulationOffset) / cycleLen));
  const nextOvulation = new Date(anchorDate);
  nextOvulation.setDate(anchorDate.getDate() + ovulationCycle * cycleLen + ovulationOffset);

  // Fertile window
  const nextFertileStart = new Date(nextOvulation);
  nextFertileStart.setDate(nextOvulation.getDate() - 5);

  const nextFertileEnd = new Date(nextOvulation);
  nextFertileEnd.setDate(nextOvulation.getDate() + 1);

  // Confidence biological dispersion window (± confidenceIntervalDays)
  const ciDays = stats.confidenceIntervalDays || Math.max(1, Math.round(stats.variabilityDays));
  const minConfidenceDate = new Date(nextStart);
  minConfidenceDate.setDate(nextStart.getDate() - ciDays);
  const maxConfidenceDate = new Date(nextStart);
  maxConfidenceDate.setDate(nextStart.getDate() + ciDays);
  const daysUntilNextPeriod = diffDays(refDate, nextStart);
  const daysUntilNextOvulation = diffDays(refDate, nextOvulation);

  return {
    nextPeriodStartDate: formatDateKey(nextStart),
    nextPeriodEndDate: formatDateKey(nextEnd),
    nextOvulationDate: (stats.isHormonalBirthControl || stats.isIrregular || stats.isPCOSModeActive || daysDiff >= cycleLen) ? '' : formatDateKey(nextOvulation),
    nextFertileWindowStart: (stats.isHormonalBirthControl || stats.isIrregular || stats.isPCOSModeActive || daysDiff >= cycleLen) ? '' : formatDateKey(nextFertileStart),
    nextFertileWindowEnd: (stats.isHormonalBirthControl || stats.isIrregular || stats.isPCOSModeActive || daysDiff >= cycleLen) ? '' : formatDateKey(nextFertileEnd),
    daysUntilNextPeriod,
    daysUntilNextOvulation: (stats.isHormonalBirthControl || stats.isIrregular || stats.isPCOSModeActive || daysDiff >= cycleLen) ? 0 : daysUntilNextOvulation,
    periodConfidenceRange: {
      minDate: formatDateKey(minConfidenceDate),
      maxDate: formatDateKey(maxConfidenceDate)
    }
  };
}
