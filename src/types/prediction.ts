import type { CyclePhase, FlowIntensity } from './cycle';

export interface HistoricalCycle {
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  lengthDays: number; // Duration of the full cycle
  periodLengthDays: number; // Duration of the bleeding days in this cycle
}

export interface IrregularityAlert {
  hasAlert: boolean;
  type: 'unusually_short' | 'unusually_long' | 'highly_variable' | 'normal';
  message: string;
}

export interface CycleStatistics {
  estimatedCycleLength: number; // e.g. 28.4
  estimatedPeriodLength: number; // e.g. 4.8
  variabilityDays: number; // e.g. ±1.8 days
  confidenceIntervalDays?: number; // Estimated spread in days from recorded variability
  lutealPhaseLength: number; // e.g. 14 days
  totalCyclesAnalyzed: number;
  outlierCyclesDetected?: number; // Atypical cycles down-weighted in the heuristic
  lastVerifiedPeriodStart: string; // YYYY-MM-DD
  confidenceScore: number; // Heuristic signal from available records, not clinical confidence
  lastCycleDelayDays?: number; // Days delayed/advanced in last cycle vs average
  delayTrendDescription?: string; // Human readable delay trend summary
  isPCOSModeActive?: boolean; // Mode active for PCOS / irregular cycles
  birthControl?: string; // Method of birth control (pill, none, etc.)
  isHormonalBirthControl?: boolean; // True if taking pill, hormonal IUD, or implant (ovulation suppressed)
  historicalCycles?: HistoricalCycle[]; // Real historical cycles recorded
  irregularityAlert?: IrregularityAlert; // Advanced check for extreme deviations
  scientificModelNote?: string; // Plain-language explanation of the estimate's limits
  insights: string[];
}

export interface PredictedDateInfo {
  date: string;
  isHistorical: boolean;
  isPeriod: boolean;
  flow?: FlowIntensity;
  isFertileWindow: boolean;
  isOvulationDay: boolean;
  phase: CyclePhase;
  dayOfCycle: number;
  cycleNumberOffset: number; // 0 = current cycle, 1 = next cycle, etc.
  confidence: number;
}

export interface UpcomingMilestones {
  nextPeriodStartDate: string;
  nextPeriodEndDate: string;
  nextOvulationDate: string;
  nextFertileWindowStart: string;
  nextFertileWindowEnd: string;
  daysUntilNextPeriod: number;
  daysUntilNextOvulation: number;
  periodConfidenceRange?: { minDate: string; maxDate: string }; // Estimated date range from recorded variability
}
