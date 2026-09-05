import { createContext } from 'react';
import type { ChroniclerResponse } from '../types/chronicler';
import type { CycleDayInfo, DailyLog, FlowIntensity, SymptomItem, UserSettings, IntimacyLog, MedicalBiomarkers, CervicalMucusType, MedicationItem } from '../types/cycle';
import type { NotificationPreference, ScheduledNotification } from '../types/notifications';
import type { CycleStatistics, UpcomingMilestones } from '../types/prediction';
import type { QuizResult } from '../types/quiz';
import type { ParseResult } from '../utils/nlpParser';

export interface CycleContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  todayDate: string;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateProfileCategory: (category: 'cycle' | 'body' | 'lifestyle', data: any) => void;
  logs: Record<string, DailyLog>;
  currentDayInfo: CycleDayInfo;
  getDayInfo: (dateStr: string) => CycleDayInfo;
  timelineDays: CycleDayInfo[];
  cycleStats: CycleStatistics;
  upcomingMilestones: UpcomingMilestones;
  notificationPrefs: NotificationPreference;
  updateNotificationPrefs: (newPrefs: Partial<NotificationPreference>) => void;
  scheduledNotifications: ScheduledNotification[];
  sendTestNotification: () => Promise<boolean>;
  isRefugio: boolean;
  toggleRefugio: (enable?: boolean) => void;
  hasHeadacheOrMigraine: boolean;
  dismissRefugioPrompt: () => void;
  isRefugioPromptDismissed: boolean;
  /** Predictions require a valid period date, not symptoms alone. */
  hasEnoughData: boolean;
  logSymptom: (date: string, symptom: SymptomItem) => void;
  logMultipleSymptoms: (date: string, symptoms: SymptomItem[]) => void;
  removeSymptom: (date: string, symptomId: string) => void;
  togglePeriodForDate: (date: string, flow?: FlowIntensity) => void;
  setPeriodFlowForDate: (date: string, flow: FlowIntensity) => void;
  startPeriodOnDate: (date: string) => void;
  denyPeriodOnDate: (date: string) => void;
  toggleSpottingForDate: (date: string) => void;
  logBleedingForDate: (date: string, options: { flow: FlowIntensity; isCycleStart: boolean; isIrregular: boolean }) => void;
  logIntimacyForDate: (date: string, intimacyData: IntimacyLog | null) => void;
  logBiomarkersForDate: (date: string, biomarkers: MedicalBiomarkers | null) => void;
  logSymptothermalForDate: (date: string, options: { cervicalMucus?: CervicalMucusType; bbt?: number }) => void;
  logMedicationsForDate: (date: string, medications: MedicationItem[]) => void;
  saveQuizResult: (result: QuizResult, date: string) => void;
  logNaturalLanguage: (date: string, text: string) => ParseResult;
  processDailyNote: (text: string, overrideDate?: string) => Promise<ChroniclerResponse>;
  lastChroniclerResponse: ChroniclerResponse | null;
  clearLastChroniclerResponse: () => void;
  resetToToday: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  destroyAllData: () => Promise<void>;
}

export const CycleContext = createContext<CycleContextType | undefined>(undefined);
