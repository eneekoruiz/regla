import type { FlowIntensity, SymptomCategory } from './cycle';

export type MoodPolarity = 'positive' | 'neutral' | 'sensitive' | 'irritable' | 'anxious';

export type EnergyLevel = 'very_low' | 'low' | 'normal' | 'high' | 'peak';

export interface PhysicalSymptomEntry {
  id: string;
  name: string;
  category: SymptomCategory;
  severity: 'mild' | 'moderate' | 'intense';
  rawSnippet: string;
  emoji: string;
}

export interface MoodEntry {
  id: string;
  name: string;
  polarity: MoodPolarity;
  rawSnippet: string;
  emoji: string;
}

export interface EnergyEntry {
  level: EnergyLevel;
  label: string;
  rawSnippet: string;
  emoji: string;
}

export interface PeriodEntry {
  detected: boolean;
  isPeriod: boolean;
  flow?: FlowIntensity;
  isCycleStart?: boolean;
  isCycleEnd?: boolean;
  rawSnippet?: string;
}

export interface CervicalMucusEntry {
  type: 'dry' | 'sticky' | 'creamy' | 'egg_white' | 'watery';
  label: string;
  rawSnippet: string;
}

export interface ChroniclerStructuredData {
  targetDate: string; // YYYY-MM-DD
  cycleDayExplicit?: number; // e.g. 2
  period: PeriodEntry;
  physicalSymptoms: PhysicalSymptomEntry[];
  moods: MoodEntry[];
  energy: EnergyEntry | null;
  cervicalMucus?: CervicalMucusEntry;
  notes: string;
  confidence: number; // 0.0 - 1.0
  extractedSummary: string[];
}

export interface ChroniclerResponse {
  success: boolean;
  data: ChroniclerStructuredData;
  empathyMessage: string;
  error?: string;
}

export interface ChroniclerContext {
  todayDate: string;
  selectedDate?: string;
  currentDayOfCycle?: number;
  currentPhase?: string;
}
