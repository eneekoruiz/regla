import type { DailyLog, UserSettings } from '../types/cycle';
import { isObject, validateLogs, validateSettings } from '../utils/dataValidation';
import { getDataStorageKey, getDefaultSettings, loadLogs, loadSettings, saveLogs, saveSettings, SETTINGS_KEY, LOGS_KEY } from '../utils/storage';
import { getApiBase } from '../utils/apiBase';

export function getRemoteToken(): string | null {
  try {
    const token = localStorage.getItem('token');
    return !token || token === 'dev-token' || token.startsWith('local-') || token.startsWith('offline-') ? null : token;
  } catch {
    return null;
  }
}

async function remoteRequest(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getApiBase()}${path}`, {
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

// Durable, account-scoped outbox. A newer edit supersedes an older retry.
const PENDING = 'aura_pending_v1';
type PendingKind = 'logs' | 'settings';
let activeWrites = 0;
let lastSyncedScope = '';
let syncChain: Promise<void> = Promise.resolve();
const pendingKey = (kind: PendingKind) => getDataStorageKey(`${PENDING}:${kind}`);
const announce = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('aura:sync-changed')); };
function cloudSettings(settings: UserSettings): UserSettings {
  const copy = { ...settings };
  delete copy.nativeHealthEnabled;
  delete copy.nativeWidgetEnabled;
  return copy;
}

export function getSyncStatus(): 'local' | 'offline' | 'pending' | 'syncing' | 'synced' {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (!getRemoteToken()) return 'local';
  if (activeWrites) return 'syncing';
  if (localStorage.getItem(pendingKey('logs')) || localStorage.getItem(pendingKey('settings'))) return 'pending';
  return lastSyncedScope === getDataStorageKey(PENDING) ? 'synced' : 'pending';
}

function enqueue(token: string, kind: PendingKind, body: unknown): Promise<void> {
  const key = pendingKey(kind);
  const revision = crypto.randomUUID();
  localStorage.setItem(key, revision);
  announce();
  const task = syncChain.catch(() => undefined).then(async () => {
    if (token !== getRemoteToken()) return;
    if (localStorage.getItem(key) !== revision) return;
    activeWrites += 1; announce();
    try {
      await remoteRequest(kind === 'logs' ? '/logs/bulk' : '/settings', token, { method: 'POST', body: JSON.stringify(body) });
      if (token === getRemoteToken() && localStorage.getItem(key) === revision) {
        localStorage.removeItem(key);
        lastSyncedScope = getDataStorageKey(PENDING);
      }
    } finally { activeWrites -= 1; announce(); }
  });
  syncChain = task;
  return task;
}

export async function retryPendingSync(): Promise<void> {
  const token = getRemoteToken();
  if (!token || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  if (localStorage.getItem(pendingKey('settings'))) await enqueue(token, 'settings', cloudSettings(loadSettings()));
  if (token !== getRemoteToken()) return;
  if (localStorage.getItem(pendingKey('logs'))) await enqueue(token, 'logs', { logs: Object.values(loadLogs()) });
}

export async function saveAllLogsToDB(logs: Record<string, DailyLog>): Promise<void> {
  const validated = validateLogs(logs);
  saveLogs(validated);
  const token = getRemoteToken();
  if (!token || Object.keys(validated).length === 0) return;
  await enqueue(token, 'logs', { logs: Object.values(validated) });
}

export async function getSettingsFromDB(): Promise<UserSettings> {
  const token = getRemoteToken();
  const local = loadSettings();
  if (!token || localStorage.getItem(pendingKey('settings'))) return local;
  try {
    const response = await remoteRequest('/settings', token);
    const payload: unknown = await response.json();
    if (token !== getRemoteToken()) return loadSettings();
    // A signed-in device hydrates from the account even when it already has
    // cached settings. Unsaved local edits are protected by CycleContext's
    // snapshot check before hydration replaces state.
    const data = isObject(payload) && isObject(payload.settings) ? payload.settings : payload;
    return {
      ...validateSettings(data, getDefaultSettings()),
      nativeHealthEnabled: local.nativeHealthEnabled ?? false,
      nativeWidgetEnabled: local.nativeWidgetEnabled ?? false,
    };
  } catch {
    // Local preferences remain available when the server is offline.
    return loadSettings();
  }
}

export async function saveSettingsToDB(settings: UserSettings): Promise<void> {
  const validated = validateSettings(settings, getDefaultSettings());
  saveSettings(validated);
  const token = getRemoteToken();
  if (token) await enqueue(token, 'settings', cloudSettings(validated));
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
  const keys = Object.keys(localStorage).filter(key => ownedKeys.has(key) || key.startsWith(`${LOGS_KEY}:`) || key.startsWith(`${SETTINGS_KEY}:`) || key.startsWith('regla_greeted_') || key.startsWith('aura_chat_v1:') || key.startsWith(PENDING));
  for (const key of keys) localStorage.removeItem(key);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('aura:data-cleared'));
}
