export interface MedicalReportOptions {
  monthsBack: 3 | 6;
  patientName?: string;
}

export interface MedicalCycleRecord {
  startDate: string;
  endDate?: string;
  cycleLengthDays: number;
  bleedingDays: number;
  predominantFlow: string;
  symptomsList: string[];
}

export interface SymptomFrequency {
  id: string;
  name: string;
  emoji: string;
  cycleCount: number;
  totalLoggedDays: number;
  percentageOfCycles: number;
  typicalSeverity: string;
}

export interface MedicalReportData {
  generatedDate: string;
  timeSpanLabel: string;
  patientName: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  variabilityDays: number;
  regularityDiagnosis: string;
  lastPeriodStartDate: string;
  totalCyclesRecorded: number;
  cycles: MedicalCycleRecord[];
  symptomFrequencies: SymptomFrequency[];
}
