import type { CyclePhase, FlowIntensity, SymptomItem } from './cycle';

export type WellnessCategory = 'physiology' | 'nutrition' | 'movement' | 'mindset' | 'rest' | 'relief';

export interface DailyWellnessAdvice {
  id: string;
  headline: string;
  advice: string;
  category: WellnessCategory;
  categoryTitle?: string;
  iconEmoji: string;
  energyLevel: string;
  focusTip?: string;
}

export interface WellnessContext {
  date: string;
  dayOfCycle: number;
  phase: CyclePhase;
  isPeriod: boolean;
  isOvulationDay: boolean;
  isFertileWindow: boolean;
  symptoms: SymptomItem[];
  hourOfDay?: number;
  hasEnoughData?: boolean;
  worstDayOfPeriod?: number;
  hasPCOS?: boolean;
  birthControl?: string;
  stressLevel?: 'low' | 'moderate' | 'high';
  activityLevel?: string;
  flow?: FlowIntensity;
}
