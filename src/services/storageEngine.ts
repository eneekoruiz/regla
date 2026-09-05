import type { DailyLog, UserSettings } from '../types/cycle';
import { isObject, validateLogs, validateSettings } from '../utils/dataValidation';
import { getDefaultSettings, loadLogs, loadSettings, saveLogs, saveSettings, SETTINGS_KEY, LOGS_KEY } from '../utils/storage';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';

export function getRemoteToken(): string | null {
  try {
    if (import.meta.env?.DEV && localStorage.getItem('dev_bypass_auth') === 'true') return null;
    const token = localStorage.getItem('token');
    return !token || token === 'dev-token' || token.startsWith('local-') || token.startsWith('offline-') ? null : token;
  } catch {
    return null;
  }
}

async function remoteRequest(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`No se pudo sincronizar (${response.status}). Los cambios siguen en este dispositivo.`);
  return response;
}

export async function getAllLogsFromDB(): Promise<Record<string, DailyLog>> {
  const token = getRemoteToken();
  if (!token) return loadLogs();
  try {
    const response = await remoteRequest('/logs', token);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error('Respuesta de registros no válida.');
    const remote: Record<string, DailyLog> = {};
    for (const row of rows) {
      if (!isObject(row) || typeof row.date !== 'string') throw new Error('Registro remoto no válido.');
      // Full data is supplied by the current API; legacy columns remain canonical.
      remote[row.date] = {
        ...(isObject(row.data) ? row.data : {}),
        date: row.date, isPeriod: row.is_period as boolean,
        flow: row.flow || undefined, symptoms: row.symptoms ?? [], recordedAt: row.recorded_at
      } as DailyLog;
    }
    if (token !== getRemoteToken()) return loadLogs();
    const merged = validateLogs(remote);
    for (const [date, local] of Object.entries(loadLogs())) {
      const incoming = merged[date];
      const localTime = Date.parse(local.recordedAt || '');
      const remoteTime = Date.parse(incoming?.recordedAt || '');
      // Local wins on ties/missing timestamps. Newer remote fields retain local-only data.
      merged[date] = incoming && Number.isFinite(localTime) && remoteTime > localTime
        ? { ...local, ...incoming }
        : local;
    }
    return merged;
  } catch {
    return loadLogs();
  }
}

export async function saveLogToDB(log: DailyLog): Promise<void> {
  return saveAllLogsToDB({ ...loadLogs(), [log.date]: log });
}

// Serialize remote writes so a slower previous save cannot overwrite a newer one.
let syncChain: Promise<void> = Promise.resolve();
function enqueue(token: string, path: string, body: unknown): Promise<void> {
  const task = syncChain.catch(() => undefined).then(async () => {
    if (token !== getRemoteToken()) return;
    await remoteRequest(path, token, { method: 'POST', body: JSON.stringify(body) });
  });
  syncChain = task;
  return task;
}

export async function saveAllLogsToDB(logs: Record<string, DailyLog>): Promise<void> {
  const validated = validateLogs(logs);
  saveLogs(validated);
  const token = getRemoteToken();
  if (!token || Object.keys(validated).length === 0) return;
  await enqueue(token, '/logs/bulk', { logs: Object.values(validated) });
}

export async function getSettingsFromDB(): Promise<UserSettings> {
  const token = getRemoteToken();
  const local = loadSettings();
  if (!token) return local;
  try {
    const response = await remoteRequest('/settings', token);
    const payload: unknown = await response.json();
    if (token !== getRemoteToken()) return loadSettings();
    // A signed-in device hydrates from the account even when it already has
    // cached settings. Unsaved local edits are protected by CycleContext's
    // snapshot check before hydration replaces state.
    const data = isObject(payload) && isObject(payload.settings) ? payload.settings : payload;
    return validateSettings(data, getDefaultSettings());
  } catch {
    // Local preferences remain available when the server is offline.
    return loadSettings();
  }
}

export async function saveSettingsToDB(settings: UserSettings): Promise<void> {
  const validated = validateSettings(settings, getDefaultSettings());
  saveSettings(validated);
  const token = getRemoteToken();
  if (token) await enqueue(token, '/settings', validated);
}

export async function wipeAllLocalData(): Promise<void> {
  const token = getRemoteToken();
  if (token) {
    // Wait for queued writes before deleting. Do not report success on a partial server deletion.
    await syncChain.catch(() => undefined);
    await remoteRequest('/logs', token, { method: 'DELETE' });
    await remoteRequest('/settings', token, { method: 'DELETE' });
  }
  const ownedKeys = new Set(['regla_user_settings_v1', 'regla_daily_logs_v1', 'aura_cycle_logs', 'regla_logs', 'token', 'cached_user', 'dev_bypass_auth']);
  const keys = Object.keys(localStorage).filter(key => ownedKeys.has(key) || key.startsWith(`${LOGS_KEY}:`) || key.startsWith(`${SETTINGS_KEY}:`) || key.startsWith('regla_greeted_') || key.startsWith('aura_chat_v1:'));
  for (const key of keys) localStorage.removeItem(key);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('aura:data-cleared'));
}
