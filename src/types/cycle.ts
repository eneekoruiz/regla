import type { NotificationPreference } from './notifications';
import type { QuizResult } from './quiz';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export type FlowIntensity = 'spotting' | 'light' | 'medium' | 'heavy' | 'very_heavy';

export type SymptomCategory = 
  | 'pain'
  | 'flow'
  | 'mood'
  | 'energy'
  | 'digestion'
  | 'sleep'
  | 'skin'
  | 'mucus'
  | 'cravings'
  | 'libido'
  | 'temperature'
  | 'intimacy'
  | 'contraception'
  | 'ovulation_test'
  | 'general'
  | 'other';

export interface SymptomItem {
  id: string;
  name: string;
  category: SymptomCategory;
  severity?: 'mild' | 'moderate' | 'intense';
  emoji: string;
}

export interface IntimacyLog {
  activity: 'unprotected' | 'protected' | 'masturbation' | 'other' | 'none';
  hadEmergencyPill?: boolean;
  hadOrgasm?: boolean;
  hadPain?: boolean; // Dispareunia
  libido?: 'high' | 'normal' | 'low';
  notes?: string;
}

export interface MedicalBiomarkers {
  progesterone?: { value: number; unit: 'ng/mL' | 'nmol/L'; interpretation?: string };
  estradiol?: { value: number; unit: 'pg/mL' | 'pmol/L' };
  lh?: { value: number; unit: 'mIU/mL'; isPositiveSurge?: boolean };
  fsh?: { value: number; unit: 'mIU/mL' };
  amh?: { value: number; unit: 'ng/mL' };
  betaHcg?: { value: number; unit: 'mIU/mL'; isPregnant?: boolean };
  bbt?: number; // Temperatura basal (°C)
  notes?: string;
}

export type CervicalMucusType = 'dry' | 'sticky' | 'creamy' | 'egg_white';

export interface MedicationItem {
  id: string;
  name: string;
  type: 'pill' | 'supplement' | 'medication';
  taken: boolean;
  time?: string;
  dose?: string;
  target?: string;
}

export interface DailyLog {
  date: string; // ISO 'YYYY-MM-DD'
  isPeriod: boolean;
  flow?: FlowIntensity;
  isIrregularBleeding?: boolean;
  isCycleStart?: boolean;
  symptoms: SymptomItem[];
  notes?: string;
  weight?: number; // kg
  sleepHours?: number; // hours
  hydrationGlasses?: number; // water intake
  intimacy?: 'protected' | 'unprotected' | 'none';
  intimacyLog?: IntimacyLog;
  cervicalMucus?: CervicalMucusType;
  bbt?: number; // Temperatura basal en °C (ej. 36.45)
  medications?: MedicationItem[];
  biomarkers?: MedicalBiomarkers;
  quizResults?: QuizResult[];
  recordedAt?: string;
}

export interface CycleProfileData {
  regularity: 'regular' | 'mostly_regular' | 'irregular' | 'pcos';
  birthControl: 'none' | 'pill' | 'iud_hormonal' | 'iud_copper' | 'implant' | 'condom' | 'other';
  typicalCramps: 'none' | 'mild' | 'moderate' | 'severe';
  cycleGoal?: 'track_health' | 'prevent_pregnancy' | 'trying_to_conceive';
  takesDailyMedication?: boolean;
  birthControlReason?: 'contraception' | 'pcos' | 'endometriosis' | 'acne' | 'heavy_bleeding' | 'other';
}

export interface BodyProfileData {
  birthYear?: number;
  age?: number;
  heightCm?: number;
  weightKg?: number;
}

export interface LifestyleProfileData {
  activityLevel: 'sedentary' | 'moderate' | 'active' | 'athlete';
  stressLevel: 'low' | 'moderate' | 'high';
  sleepHoursAvg: number;
  caffeineIntake?: 'none' | 'low' | 'moderate' | 'high';
}

export interface UserSettings {
  userName: string;
  averageCycleLength: number; // e.g., 28
  averagePeriodLength: number; // e.g., 5
  lutealPhaseLength: number; // e.g., 14
  lastPeriodStartDate: string; // YYYY-MM-DD
  theme: 'light' | 'dark' | 'system' | 'refugio';
  notificationPreferences?: NotificationPreference;
  hasPCOS?: boolean; // Mode for PCOS / Polycystic Ovary Syndrome (irregular cycles)
  worstDayOfPeriod?: number; // e.g. 1, 2, or 3 (day of highest discomfort)
  typicalFlowIntensity?: FlowIntensity; // e.g. 'light', 'medium', 'heavy'
  regularityPreference?: 'very_regular' | 'mostly_regular' | 'irregular' | 'pcos';
  // Modular Onboarding / Progressive Profile
  cycleProfile?: CycleProfileData;
  bodyProfile?: BodyProfileData;
  lifestyleProfile?: LifestyleProfileData;
  completedOnboardingCategories?: string[]; // e.g. ['cycle', 'body', 'lifestyle']
}

export interface CycleDayInfo {
  date: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfMonth: number;
  dayOfWeekShort: string;
  monthNameShort: string;
  monthNameFull: string;
  year: number;
  isToday: boolean;
  isSelected: boolean;
  dayOfCycle: number; // 1 to cycleLength
  phase: CyclePhase;
  phaseName: string;
  phaseColor: string;
  isPeriod: boolean;
  flow?: FlowIntensity;
  isFertileWindow: boolean;
  isOvulationDay: boolean;
  symptoms: SymptomItem[];
  notes?: string;
  hasLog: boolean;
}
