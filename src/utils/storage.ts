import type { DailyLog, UserSettings } from '../types/cycle';
import { isObject, parseDataJSON, validateLogs, validateSettings } from './dataValidation';

export const SETTINGS_KEY = 'regla_user_settings_v1';
export const LOGS_KEY = 'regla_daily_logs_v1';
let storageErrorReported = false;

export function getDataStorageKey(key: string): string {
  const token = localStorage.getItem('token');
  if (!token || token === 'dev-token' || token.startsWith('local-') || token.startsWith('offline-')) return key;
  let owner = 'unverified';
  try {
    const user = parseDataJSON(localStorage.getItem('cached_user') || 'null');
    if (isObject(user) && typeof user.id === 'string' && user.id) owner = user.id;
  } catch { /* Unverified sessions never read the private local profile. */ }
  return `${key}:${encodeURIComponent(owner)}`;
}

export class StoragePersistenceError extends Error {
  constructor() {
    super('No se han podido guardar los cambios en este dispositivo. Comprueba el espacio disponible y los permisos del navegador.');
    this.name = 'StoragePersistenceError';
  }
}

function reportStorageError(): void {
  storageErrorReported = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aura:storage-error'));
}

export function hasReportedStorageError(): boolean {
  return storageErrorReported;
}

export function clearReportedStorageError(): void {
  storageErrorReported = false;
}

export function getDefaultSettings(): UserSettings {
  return {
    userName: '',
    averageCycleLength: 28,
    averagePeriodLength: 5,
    lutealPhaseLength: 14,
    lastPeriodStartDate: '',
    theme: 'system',
    worstDayOfPeriod: 1,
    typicalFlowIntensity: 'medium',
    regularityPreference: 'mostly_regular'
  };
}

export function getDefaultSampleLogs(): Record<string, DailyLog> {
  return {};
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(getDataStorageKey(SETTINGS_KEY));
    if (!raw) return getDefaultSettings();
    return validateSettings(parseDataJSON(raw), getDefaultSettings());
  } catch {
    reportStorageError();
    return getDefaultSettings();
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    const validated = validateSettings(settings, getDefaultSettings());
    const key = getDataStorageKey(SETTINGS_KEY);
    const previous = localStorage.getItem(key);
    if (previous) validateSettings(parseDataJSON(previous), getDefaultSettings());
    localStorage.setItem(key, JSON.stringify(validated));
  } catch {
    reportStorageError();
    throw new StoragePersistenceError();
  }
}

export function loadLogs(_settings?: UserSettings): Record<string, DailyLog> {
  try {
    const raw = localStorage.getItem(getDataStorageKey(LOGS_KEY));
    if (!raw) {
      return getDefaultSampleLogs();
    }
    return validateLogs(parseDataJSON(raw));
  } catch {
    reportStorageError();
    return {};
  }
}

export function saveLogs(logs: Record<string, DailyLog>): void {
  try {
    const key = getDataStorageKey(LOGS_KEY);
    const previous = localStorage.getItem(key);
    if (previous) validateLogs(parseDataJSON(previous));
    localStorage.setItem(key, JSON.stringify(validateLogs(logs)));
  } catch {
    reportStorageError();
    throw new StoragePersistenceError();
  }
}

export function exportBackupJSON(settings: UserSettings, logs: Record<string, DailyLog>): string {
  return JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: validateSettings(settings, getDefaultSettings()),
    logs: validateLogs(logs)
  }, null, 2);
}

export function importBackupJSON(jsonStr: string): { settings: UserSettings; logs: Record<string, DailyLog> } {
  if (jsonStr.length > 20_000_000) throw new Error('La copia supera el tamaño permitido de 20 MB.');
  const data = parseDataJSON(jsonStr);
  if (!isObject(data) || !data.settings || !data.logs || (data.version !== undefined && data.version !== 1)) {
    throw new Error('Formato de copia de seguridad no válido');
  }
  return {
    settings: validateSettings(data.settings, getDefaultSettings()),
    logs: validateLogs(data.logs)
  };
}

/** A failed restore must leave both previous collections intact. */
export function persistBackup(settings: UserSettings, logs: Record<string, DailyLog>): void {
  const settingsKey = getDataStorageKey(SETTINGS_KEY);
  const logsKey = getDataStorageKey(LOGS_KEY);
  const previousSettings = localStorage.getItem(settingsKey);
  const previousLogs = localStorage.getItem(logsKey);
  try {
    const validated = importBackupJSON(exportBackupJSON(settings, logs));
    localStorage.setItem(logsKey, JSON.stringify(validated.logs));
    localStorage.setItem(settingsKey, JSON.stringify(validated.settings));
  } catch (error) {
    reportStorageError();
    if (previousLogs === null) localStorage.removeItem(logsKey);
    else localStorage.setItem(logsKey, previousLogs);
    if (previousSettings === null) localStorage.removeItem(settingsKey);
    else localStorage.setItem(settingsKey, previousSettings);
    throw error;
  }
}
