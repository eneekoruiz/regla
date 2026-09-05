import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChroniclerResponse, ChroniclerContext } from '../types/chronicler';
import type { CycleDayInfo, DailyLog, FlowIntensity, SymptomItem, UserSettings, IntimacyLog, MedicalBiomarkers, CervicalMucusType, MedicationItem } from '../types/cycle';
import type { NotificationPreference } from '../types/notifications';
import type { QuizResult } from '../types/quiz';
import { CycleContext } from './cycle-context';
import { addQuizResultToLogs } from '../services/quizResults';
import { formatDateKey, generateDaysRange, getCycleDayInfo } from '../utils/cycleCalculator';
import type { ParseResult } from '../utils/nlpParser';
import { parseNaturalLanguageInput } from '../utils/nlpParser';
import { analyzeChronicleNote } from '../services/chroniclerAgent';
import { calculateCycleStatistics, calculateUpcomingMilestones, extractPeriodClusters } from '../services/predictiveEngine';
import {
  getDefaultNotificationPreferences,
  scheduleLocalMilestones,
  sendInstantTestNotification
} from '../services/localNotificationEngine';
import {
  getAllLogsFromDB,
  getSettingsFromDB,
  saveAllLogsToDB,
  getRemoteToken,
  saveSettingsToDB,
  wipeAllLocalData
} from '../services/storageEngine';
import { exportBackupJSON, getDefaultSettings, importBackupJSON, loadLogs, loadSettings, persistBackup, saveLogs, saveSettings } from '../utils/storage';
import { isDateKey } from '../utils/dateKey';
import { validateLogs, validateSettings } from '../utils/dataValidation';
import { updateSymptothermalLog } from '../utils/dailyLog';



export const CycleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [todayDate, setTodayDate] = useState(() => formatDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [settings, setSettingsState] = useState<UserSettings>(() => loadSettings());
  const [logs, setLogsState] = useState<Record<string, DailyLog>>(() => loadLogs(settings));
  const settingsRef = useRef(settings);
  const logsRef = useRef(logs);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastChroniclerResponse, setLastChroniclerResponse] = useState<ChroniclerResponse | null>(null);
  const [dismissedRefugioDate, setDismissedRefugioDate] = useState<string | null>(null);

  // Calendar days can change while the app is open or suspended overnight.
  useEffect(() => {
    const refreshDay = () => setTodayDate(formatDateKey(new Date()));
    const timer = window.setInterval(refreshDay, 30_000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  // Preserve edits made during hydration; replay the local snapshot on reconnect.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!getRemoteToken()) return;
      const initialSettings = settingsRef.current;
      const initialLogs = logsRef.current;
      try {
        const [dbSettings, dbLogs] = await Promise.all([getSettingsFromDB(), getAllLogsFromDB()]);
        if (cancelled) return;
        if (settingsRef.current === initialSettings) {
          saveSettings(dbSettings);
          settingsRef.current = dbSettings;
          setSettingsState(dbSettings);
        }
        if (logsRef.current === initialLogs) {
          saveLogs(dbLogs);
          logsRef.current = dbLogs;
          setLogsState(dbLogs);
        }
        await Promise.all([saveSettingsToDB(settingsRef.current), saveAllLogsToDB(logsRef.current)]);
      } catch {
        // Local writes remain durable and will be retried at the next connection.
      }
    }
    const changeSession = () => {
      const nextSettings = loadSettings();
      const nextLogs = loadLogs();
      settingsRef.current = nextSettings;
      logsRef.current = nextLogs;
      setSettingsState(nextSettings);
      setLogsState(nextLogs);
      setLastChroniclerResponse(null);
      void hydrate();
    };
    void hydrate();
    window.addEventListener('online', hydrate);
    window.addEventListener('aura:session-changed', changeSession);
    return () => {
      cancelled = true;
      window.removeEventListener('online', hydrate);
      window.removeEventListener('aura:session-changed', changeSession);
    };
  }, []);

  const commitSettings = (updater: (previous: UserSettings) => UserSettings) => {
    const updated = validateSettings(updater(settingsRef.current), getDefaultSettings());
    saveSettings(updated);
    settingsRef.current = updated;
    setSettingsState(updated);
    void saveSettingsToDB(updated).catch(() => undefined);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    commitSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
  };

  const updateProfileCategory = (category: 'cycle' | 'body' | 'lifestyle', data: any) => {
    commitSettings((prev) => {
      const prevCompleted = prev.completedOnboardingCategories || [];
      const nextCompleted = prevCompleted.includes(category)
        ? prevCompleted
        : [...prevCompleted, category];

      const patch: Partial<UserSettings> = {
        completedOnboardingCategories: nextCompleted
      };

      if (category === 'cycle') {
        patch.cycleProfile = { ...(prev.cycleProfile || {}), ...data };
        if (data.regularity === 'pcos') {
          patch.hasPCOS = true;
          patch.regularityPreference = 'pcos';
        } else if (data.regularity === 'irregular') {
          patch.regularityPreference = 'irregular';
        } else if (data.regularity === 'regular') {
          patch.regularityPreference = 'very_regular';
        }
      } else if (category === 'body') {
        patch.bodyProfile = { ...(prev.bodyProfile || {}), ...data };
      } else if (category === 'lifestyle') {
        patch.lifestyleProfile = { ...(prev.lifestyleProfile || {}), ...data };
      }

      const updated = { ...prev, ...patch };
      return updated;
    });
  };

  const updateLogs = (updater: (prev: Record<string, DailyLog>) => Record<string, DailyLog>) => {
    const updated = validateLogs(updater(logsRef.current));
    saveLogs(updated);
    logsRef.current = updated;
    setLogsState(updated);
    void saveAllLogsToDB(updated).catch(() => undefined);
  };

  const saveQuizResult = (result: QuizResult, date: string): void => {
    updateLogs(previous => addQuizResultToLogs(previous, result, date));
  };

  // Adaptive Cycle Statistics
  const cycleStats = useMemo(() => {
    return calculateCycleStatistics(logs, settings);
  }, [logs, settings]);

  // Upcoming Milestones
  const upcomingMilestones = useMemo(() => {
    return calculateUpcomingMilestones(cycleStats, todayDate);
  }, [cycleStats, todayDate]);

  // Notification Preferences
  const notificationPrefs: NotificationPreference = useMemo(() => {
    return settings.notificationPreferences || getDefaultNotificationPreferences();
  }, [settings.notificationPreferences]);

  const updateNotificationPrefs = (newPrefs: Partial<NotificationPreference>) => {
    const updated = { ...notificationPrefs, ...newPrefs };
    updateSettings({ notificationPreferences: updated });
  };

  // Scheduled notifications computed locally from milestones
  const scheduledNotifications = useMemo(() => {
    return scheduleLocalMilestones(upcomingMilestones, notificationPrefs);
  }, [upcomingMilestones, notificationPrefs]);

  const sendTestNotification = async () => {
    return await sendInstantTestNotification(notificationPrefs);
  };

  const getDayInfo = (dateStr: string): CycleDayInfo => {
    return getCycleDayInfo(dateStr, selectedDate, settings, logs);
  };

  const currentDayInfo = useMemo(() => {
    return getCycleDayInfo(selectedDate, selectedDate, settings, logs);
  }, [selectedDate, settings, logs]);

  const timelineDays = useMemo(() => {
    return generateDaysRange(selectedDate, selectedDate, 45, 45, settings, logs, todayDate);
  }, [todayDate, selectedDate, settings, logs]);

  // Modo Refugio state
  const isRefugio = settings.theme === 'refugio';

  const toggleRefugio = (enable?: boolean) => {
    const shouldEnable = enable !== undefined ? enable : !isRefugio;
    updateSettings({ theme: shouldEnable ? 'refugio' : 'light' });
  };

  const hasHeadacheOrMigraine = useMemo(() => {
    return currentDayInfo.symptoms.some(
      (s) => s.id === 'headache' || s.name.toLowerCase().includes('cabeza') || s.name.toLowerCase().includes('migraña') || s.name.toLowerCase().includes('jaqueca')
    );
  }, [currentDayInfo.symptoms]);

  const isRefugioPromptDismissed = dismissedRefugioDate === selectedDate;

  const dismissRefugioPrompt = () => {
    setDismissedRefugioDate(selectedDate);
  };

  // Symptoms alone do not establish a cycle or a fertile window.
  const hasEnoughData = useMemo(() => {
    return Boolean(cycleStats.lastVerifiedPeriodStart);
  }, [cycleStats.lastVerifiedPeriodStart]);

  const logSymptom = (date: string, symptom: SymptomItem) => {
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const exists = currentLog.symptoms.some((s) => s.id === symptom.id);
      const newSymptoms = exists
        ? currentLog.symptoms.map((s) => (s.id === symptom.id ? symptom : s))
        : [...currentLog.symptoms, symptom];

      const newLog = {
        ...currentLog,
        symptoms: newSymptoms,
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [date]: newLog
      };
    });
  };

  const logMultipleSymptoms = (date: string, symptomsToAdd: SymptomItem[]) => {
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const currentMap = new Map(currentLog.symptoms.map(s => [s.id, s]));
      symptomsToAdd.forEach(s => currentMap.set(s.id, s));

      const newLog: DailyLog = {
        ...currentLog,
        symptoms: Array.from(currentMap.values()),
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [date]: newLog
      };
    });
  };

  const removeSymptom = (date: string, symptomId: string) => {
    updateLogs((prev) => {
      const currentLog = prev[date];
      if (!currentLog) return prev;
      const newLog = {
        ...currentLog,
        symptoms: currentLog.symptoms.filter((s) => s.id !== symptomId),
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [date]: newLog
      };
    });
  };

  const togglePeriodForDate = (date: string, flow?: FlowIntensity) => {
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const nextIsPeriod = !currentLog.isPeriod;

      const defaultFlow = settings.typicalFlowIntensity || 'medium';
      const newLog = {
        ...currentLog,
        isPeriod: nextIsPeriod,
        flow: nextIsPeriod ? (flow || currentLog.flow || defaultFlow) : undefined,
        recordedAt: new Date().toISOString()
      };

      const nextLogs = {
        ...prev,
        [date]: newLog
      };

      // Dynamically recalculate the latest period start date anchor
      const clusters = extractPeriodClusters(nextLogs, '');
      if (clusters.length > 0) {
        const latestPeriodStart = clusters[clusters.length - 1].startDate;
        if (latestPeriodStart !== settings.lastPeriodStartDate) {
          updateSettings({ lastPeriodStartDate: latestPeriodStart });
        }
      }

      return nextLogs;
    });
  };

  const setPeriodFlowForDate = (date: string, flow: FlowIntensity) => {
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const newLog = {
        ...currentLog,
        isPeriod: flow !== 'spotting',
        flow,
        recordedAt: new Date().toISOString()
      };
      const nextLogs = {
        ...prev,
        [date]: newLog
      };
      return nextLogs;
    });
  };

  const denyPeriodOnDate = (date: string) => {
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const newLog = {
        ...currentLog,
        isPeriod: false,
        flow: undefined,
        recordedAt: new Date().toISOString()
      };
      return { ...prev, [date]: newLog };
    });
  };

  const startPeriodOnDate = (startDateStr: string) => {
    if (!isDateKey(startDateStr) || startDateStr > todayDate) return;
    const defaultFlow = settings.typicalFlowIntensity || 'medium';
    // An observed start is one recorded day; future bleeding remains a prediction.
    updateLogs((prev) => {
      const current = prev[startDateStr] || { date: startDateStr, isPeriod: false, symptoms: [] };
      return { ...prev, [startDateStr]: { ...current, isPeriod: true, isCycleStart: true, isIrregularBleeding: false, flow: defaultFlow === 'spotting' ? 'light' : defaultFlow, recordedAt: new Date().toISOString() } };
    });
    updateSettings({ lastPeriodStartDate: startDateStr });
  };

  const toggleSpottingForDate = (dateStr: string) => {
    const spottingSymptom: SymptomItem = {
      id: 'spotting',
      name: 'Manchado',
      category: 'flow',
      emoji: '🩸'
    };

    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };
      const hasSpotting = currentLog.symptoms.some((s) => s.id === 'spotting');

      let updatedSymptoms: SymptomItem[];
      if (hasSpotting) {
        updatedSymptoms = currentLog.symptoms.filter((s) => s.id !== 'spotting');
      } else {
        updatedSymptoms = [...currentLog.symptoms, spottingSymptom];
      }

      const newLog: DailyLog = {
        ...currentLog,
        symptoms: updatedSymptoms,
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [dateStr]: newLog
      };
    });
  };

  const logBleedingForDate = (
    dateStr: string,
    options: { flow: FlowIntensity; isCycleStart: boolean; isIrregular: boolean }
  ) => {
    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };
      const isPeriod = !options.isIrregular && options.flow !== 'spotting';

      // If irregular bleeding, add tag symptom
      let updatedSymptoms = currentLog.symptoms;
      if (options.isIrregular) {
        const irregularSymptom: SymptomItem = {
          id: 'irregular_bleeding',
          name: 'Sangrado irregular',
          category: 'flow',
          emoji: '💧'
        };
        if (!updatedSymptoms.some(s => s.id === 'irregular_bleeding')) {
          updatedSymptoms = [...updatedSymptoms, irregularSymptom];
        }
      }

      const newLog: DailyLog = {
        ...currentLog,
        isPeriod,
        flow: options.flow,
        isIrregularBleeding: options.isIrregular,
        isCycleStart: options.isCycleStart,
        symptoms: updatedSymptoms,
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [dateStr]: newLog
      };
    });

    if (options.isCycleStart && !options.isIrregular && options.flow !== 'spotting') {
      updateSettings({ lastPeriodStartDate: dateStr });
    }
  };

  const logIntimacyForDate = (dateStr: string, intimacyData: IntimacyLog | null) => {
    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };

      const intimacyCompatibility = intimacyData
        ? (intimacyData.activity === 'unprotected'
            ? 'unprotected'
            : intimacyData.activity === 'protected'
            ? 'protected'
            : 'none')
        : 'none';

      let updatedSymptoms = [...currentLog.symptoms];
      if (intimacyData?.hadEmergencyPill) {
        if (!updatedSymptoms.some(s => s.id === 'emergency_pill')) {
          updatedSymptoms.push({
            id: 'emergency_pill',
            name: 'Píldora de Emergencia',
            category: 'contraception',
            emoji: '💊'
          });
        }
      }

      const newLog: DailyLog = {
        ...currentLog,
        intimacy: intimacyCompatibility,
        intimacyLog: intimacyData || undefined,
        symptoms: updatedSymptoms,
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [dateStr]: newLog
      };
    });
  };

  const logBiomarkersForDate = (dateStr: string, biomarkers: MedicalBiomarkers | null) => {
    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };
      const newLog: DailyLog = {
        ...currentLog,
        biomarkers: biomarkers || undefined,
        recordedAt: new Date().toISOString()
      };
      return {
        ...prev,
        [dateStr]: newLog
      };
    });
  };

  const logSymptothermalForDate = (dateStr: string, options: { cervicalMucus?: CervicalMucusType; bbt?: number }) => {
    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };
      const newLog = updateSymptothermalLog(currentLog, options);
      return {
        ...prev,
        [dateStr]: newLog
      };
    });
  };

  const logMedicationsForDate = (dateStr: string, medications: MedicationItem[]) => {
    updateLogs((prev) => {
      const currentLog = prev[dateStr] || { date: dateStr, isPeriod: false, symptoms: [] };
      const newLog: DailyLog = {
        ...currentLog,
        medications,
        recordedAt: new Date().toISOString()
      };
      return {
        ...prev,
        [dateStr]: newLog
      };
    });
  };

  const logNaturalLanguage = (date: string, text: string): ParseResult => {
    const parsed = parseNaturalLanguageInput(text);
    updateLogs((prev) => {
      const currentLog = prev[date] || { date, isPeriod: false, symptoms: [] };
      const existingIds = new Set(currentLog.symptoms.map((s) => s.id));
      const mergedSymptoms = [...currentLog.symptoms];

      parsed.symptoms.forEach((s) => {
        if (!existingIds.has(s.id)) {
          mergedSymptoms.push(s);
          existingIds.add(s.id);
        }
      });

      let nextIsPeriod = currentLog.isPeriod;
      if (parsed.periodAction === 'start') nextIsPeriod = true;
      if (parsed.periodAction === 'stop') nextIsPeriod = false;
      const nextFlow = parsed.flow !== undefined ? parsed.flow : currentLog.flow;

      const newLog: DailyLog = {
        ...currentLog,
        isPeriod: nextIsPeriod,
        flow: nextFlow,
        symptoms: mergedSymptoms,
        recordedAt: new Date().toISOString()
      };

      return {
        ...prev,
        [date]: newLog
      };
    });

    return parsed;
  };

  const processDailyNote = async (text: string, overrideDate?: string): Promise<ChroniclerResponse> => {
    const targetDate = overrideDate || selectedDate;

    const chroniclerContext: ChroniclerContext = {
      todayDate,
      selectedDate: targetDate,
      currentDayOfCycle: currentDayInfo.dayOfCycle,
      currentPhase: currentDayInfo.phase
    };

    const analysis = await analyzeChronicleNote(text, chroniclerContext);

    if (analysis.success && analysis.data) {
      const logDate = overrideDate || analysis.data.targetDate || targetDate;
      updateLogs((prev) => {
        const target = prev[logDate] || { date: logDate, isPeriod: false, symptoms: [] };
        const existingIds = new Set(target.symptoms.map((s) => s.id));
        const mergedSymptoms = [...target.symptoms];

        analysis.data.physicalSymptoms.forEach((s) => {
          if (!existingIds.has(s.id)) {
            mergedSymptoms.push({
              id: s.id,
              name: s.name,
              category: s.category,
              emoji: s.emoji,
              severity: s.severity
            });
            existingIds.add(s.id);
          }
        });

        for (const mood of analysis.data.moods) {
          if (!existingIds.has(mood.id)) {
            mergedSymptoms.push({ id: mood.id, name: mood.name, emoji: mood.emoji, category: 'mood' });
            existingIds.add(mood.id);
          }
        }
        const energy = analysis.data.energy;
        if (energy && !existingIds.has(`energy_${energy.level}`)) {
          mergedSymptoms.push({ id: `energy_${energy.level}`, name: energy.label, emoji: energy.emoji, category: 'energy' });
        }
        const nextIsPeriod = analysis.data.period?.detected ? analysis.data.period.isPeriod && analysis.data.period.flow !== 'spotting' : target.isPeriod;
        const nextFlow = analysis.data.period?.flow !== undefined ? analysis.data.period.flow : target.flow;
        const updatedNotes = target.notes ? `${target.notes}\n${text}` : text;

        const newLog: DailyLog = {
          ...target,
          isPeriod: nextIsPeriod,
          flow: nextFlow,
          ...(analysis.data.period.isCycleStart ? { isCycleStart: true } : {}),
          ...(analysis.data.cervicalMucus && analysis.data.cervicalMucus.type !== 'watery' ? { cervicalMucus: analysis.data.cervicalMucus.type } : {}),
          symptoms: mergedSymptoms,
          notes: updatedNotes,
          recordedAt: new Date().toISOString()
        };

        return {
          ...prev,
          [logDate]: newLog
        };
      });
    }

    if (!analysis.success || !analysis.data) {
      throw new Error(analysis.error || 'No se ha podido analizar la nota.');
    }
    setLastChroniclerResponse(analysis);
    return analysis;
  };

  const clearLastChroniclerResponse = () => {
    setLastChroniclerResponse(null);
  };

  const resetToToday = () => {
    setSelectedDate(todayDate);
  };

  const exportData = () => {
    return exportBackupJSON(settings, logs);
  };

  const importData = (jsonStr: string) => {
    try {
      const imported = importBackupJSON(jsonStr);
      if (!imported) return false;

      persistBackup(imported.settings, imported.logs);
      settingsRef.current = imported.settings;
      logsRef.current = imported.logs;
      setSettingsState(imported.settings);
      saveSettingsToDB(imported.settings).catch(console.error);

      setLogsState(imported.logs);
      saveAllLogsToDB(imported.logs).catch(console.error);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const destroyAllData = async () => {
    await wipeAllLocalData();
    const defaults = getDefaultSettings();
    settingsRef.current = defaults;
    logsRef.current = {};
    setSettingsState(defaults);
    setLogsState({});
    setLastChroniclerResponse(null);
  };

  // Theme application (Dark, Light, System, Refugio)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-refugio');

    if (settings.theme === 'refugio') {
      root.classList.add('dark', 'theme-refugio');
    } else if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      // Light is default
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
    }
  }, [settings.theme]);

  return (
    <CycleContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        todayDate,
        settings,
        updateSettings,
        updateProfileCategory,
        logs,
        currentDayInfo,
        getDayInfo,
        timelineDays,
        cycleStats,
        upcomingMilestones,
        notificationPrefs,
        updateNotificationPrefs,
        scheduledNotifications,
        sendTestNotification,
        isRefugio,
        toggleRefugio,
        hasHeadacheOrMigraine,
        dismissRefugioPrompt,
        isRefugioPromptDismissed,
        hasEnoughData,
        logSymptom,
        logMultipleSymptoms,
        removeSymptom,
        togglePeriodForDate,
        setPeriodFlowForDate,
        startPeriodOnDate,
        denyPeriodOnDate,
        toggleSpottingForDate,
        logBleedingForDate,
        logIntimacyForDate,
        logBiomarkersForDate,
        logSymptothermalForDate,
        logMedicationsForDate,
        saveQuizResult,
        logNaturalLanguage,
        processDailyNote,
        lastChroniclerResponse,
        clearLastChroniclerResponse,
        resetToToday,
        isSettingsOpen,
        setIsSettingsOpen,
        exportData,
        importData,
        destroyAllData
      }}
    >
      {children}
    </CycleContext.Provider>
  );
};
