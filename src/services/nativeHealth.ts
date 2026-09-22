import { Capacitor, registerPlugin } from '@capacitor/core';
import type { DailyLog, FlowIntensity } from '../types/cycle';
import { isDateKey } from '../utils/dateKey';
import { validateLogs } from '../utils/dataValidation';
import { getDataStorageKey, loadSettings } from '../utils/storage';

export interface HealthDay { date: string; flow?: FlowIntensity; }
export interface WidgetSnapshot { date: string; title: string; day: number; progress: number; }
interface AuraDevicePlugin {
  authorize(): Promise<{ granted: boolean }>;
  readPeriodDays(): Promise<{ days: HealthDay[] }>;
  writePeriodDays(options: { days: { date: string; flow?: FlowIntensity; isPeriod: boolean; version: number; recordId: string }[] }): Promise<void>;
  updateWidget(options: { snapshot: WidgetSnapshot | null }): Promise<void>;
}
const device = registerPlugin<AuraDevicePlugin>('AuraDevice');
export const hasNativeHealth = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AuraDevice');
export async function authorizeNativeHealth() {
  if (!hasNativeHealth()) throw new Error('Disponible en la aplicación nativa de Aura para iOS y Android.');
  return device.authorize();
}
export function mergeHealthDays(logs: Record<string, DailyLog>, days: readonly HealthDay[], today: string): Record<string, DailyLog> {
  const merged = { ...logs };
  for (const day of days) {
    if (!isDateKey(day.date) || day.date > today || merged[day.date]) continue;
    if (day.flow !== undefined && !['light', 'medium', 'heavy', 'very_heavy', 'spotting'].includes(day.flow)) continue;
    merged[day.date] = { date: day.date, isPeriod: day.flow !== 'spotting', flow: day.flow, symptoms: [], healthImported: true, recordedAt: new Date().toISOString() };
  }
  // Existing local observations always win; imports never create future days.
  return validateLogs(merged);
}
export async function readNativeHealth() { return (await device.readPeriodDays()).days; }
let healthWrites: Promise<void> = Promise.resolve();
export function writeNativeHealth(logs: Record<string, DailyLog>, today: string): Promise<void> {
  const key = getDataStorageKey('aura_health_exported_v1');
  const task = healthWrites.catch(() => undefined).then(() => writeNativeSnapshot(logs, today, key));
  healthWrites = task;
  return task;
}
async function writeNativeSnapshot(logs: Record<string, DailyLog>, today: string, key: string) {
  if (key !== getDataStorageKey('aura_health_exported_v1') || !loadSettings().nativeHealthEnabled) return;
  const previous: unknown = JSON.parse(localStorage.getItem(key) || '{}');
  const ledger: Record<string, string> = {};
  if (Array.isArray(previous)) {
    for (const date of previous.filter(isDateKey)) ledger[date] = '';
  } else if (previous && typeof previous === 'object') {
    for (const [date, signature] of Object.entries(previous)) {
      if (isDateKey(date) && typeof signature === 'string') ledger[date] = signature;
    }
  }
  const candidates = new Set([...Object.keys(ledger), ...Object.values(logs).filter(log => !log.healthImported && log.date <= today && (log.isPeriod || log.flow || log.isCycleStart)).map(log => log.date)]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const scope = [...new Uint8Array(digest)].slice(0, 16).map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (key !== getDataStorageKey('aura_health_exported_v1') || !loadSettings().nativeHealthEnabled) return;
  const days = [];
  for (const date of candidates) {
    if (date > today) continue;
    const log = logs[date];
    const isPeriod = Boolean(log?.isPeriod && !log.isIrregularBleeding && log.flow !== 'spotting');
    const signature = JSON.stringify([isPeriod, log?.flow ?? null]);
    if (ledger[date] === signature) continue;
    days.push({ date, flow: log?.flow, isPeriod, version: Math.max(1, Date.parse(log?.recordedAt || '') || Date.now()), recordId: 'aura-' + scope + '-' + date });
    ledger[date] = signature;
  }
  if (!days.length) return;
  await device.writePeriodDays({ days });
  // Only changed bleeding is exported; notes never trigger a rewrite of years of samples.
  if (key === getDataStorageKey('aura_health_exported_v1')) localStorage.setItem(key, JSON.stringify(ledger));
}
let widgetWrites: Promise<void> = Promise.resolve();
export function publishNativeWidget(snapshot: WidgetSnapshot | null): Promise<void> {
  if (!hasNativeHealth()) return Promise.resolve();
  const task = widgetWrites.catch(() => undefined).then(() => device.updateWidget({ snapshot }));
  widgetWrites = task;
  return task;
}
