import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { saveSettingsToDB, getSettingsFromDB, saveAllLogsToDB, retryPendingSync } from '../../src/services/storageEngine.ts';
import { loadLogs, loadSettings, getDefaultSettings } from '../../src/utils/storage.ts';
import { mergeHealthDays } from '../../src/services/nativeHealth.ts';

const originalFetch = globalThis.fetch;
class Store {
  getItem(key) { return Object.hasOwn(this, key) ? this[key] : null; }
  setItem(key, value) { Object.defineProperty(this, key, { value: String(value), writable: true, configurable: true, enumerable: true }); }
  removeItem(key) { delete this[key]; }
}
beforeEach(() => { globalThis.localStorage = new Store(); localStorage.setItem('token', 'remote-token'); });
after(() => { globalThis.fetch = originalFetch; });

test('pending profile survives offline save and cannot be replaced by old cloud preferences', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(saveSettingsToDB({ ...getDefaultSettings(), userName: 'Latest local' }));
  globalThis.fetch = async () => Response.json({ ...getDefaultSettings(), userName: 'Old cloud' });
  assert.equal((await getSettingsFromDB()).userName, 'Latest local');
  assert.ok(Object.keys(localStorage).some(k => k.startsWith('aura_pending_v1:settings')));
  await retryPendingSync();
  assert.equal(Object.keys(localStorage).some(k => k.startsWith('aura_pending_v1:settings')), false);
  assert.equal(loadSettings().userName, 'Latest local');
});

test('durable retry sends the latest complete local record and clears its own revision', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 });
  const log = { date: '2026-06-01', isPeriod: true, symptoms: [], notes: 'Kept offline', recordedAt: '2026-06-01T12:00:00Z' };
  await assert.rejects(saveAllLogsToDB({ [log.date]: log }));
  let body;
  globalThis.fetch = async (_url, options) => { body = JSON.parse(options.body); return Response.json({ ok: true }); };
  await retryPendingSync();
  assert.equal(body.logs[0].notes, 'Kept offline');
  assert.equal(loadLogs()[log.date].notes, 'Kept offline');
  assert.equal(Object.keys(localStorage).some(k => k.startsWith('aura_pending_v1:logs')), false);
});

test('account B never retries account A pending records', async () => {
  localStorage.setItem('cached_user', JSON.stringify({ id: 'a', email: 'a@example.test' }));
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(saveSettingsToDB({ ...getDefaultSettings(), userName: 'A' }));
  localStorage.setItem('cached_user', JSON.stringify({ id: 'b', email: 'b@example.test' }));
  globalThis.fetch = async () => assert.fail('Do not send another account snapshot');
  await retryPendingSync();
});

test('Health permissions and widget visibility stay on this device during cloud sync', async () => {
  let body;
  globalThis.fetch = async (_url, options) => {
    if (options.method === 'POST') { body = JSON.parse(options.body); return Response.json({ ok: true }); }
    return Response.json({ ...getDefaultSettings(), nativeHealthEnabled: false, nativeWidgetEnabled: false });
  };
  await saveSettingsToDB({ ...getDefaultSettings(), nativeHealthEnabled: true, nativeWidgetEnabled: true });
  assert.equal(body.nativeHealthEnabled, undefined);
  assert.equal(body.nativeWidgetEnabled, undefined);
  const restored = await getSettingsFromDB();
  assert.equal(restored.nativeHealthEnabled, true);
  assert.equal(restored.nativeWidgetEnabled, true);
});

test('health history import is idempotent, local edits win, future and invalid dates are ignored', () => {
  const local = { date: '2026-06-01', isPeriod: false, notes: 'Corrected', symptoms: [] };
  const days = [{ date: '2026-06-01', flow: 'heavy' }, { date: '2026-06-02', flow: 'light' }, { date: '2026-02-31', flow: 'medium' }, { date: '2028-01-01', flow: 'heavy' }];
  const merged = mergeHealthDays({ [local.date]: local }, days, '2026-06-10');
  assert.deepEqual(merged[local.date], local);
  assert.equal(merged['2026-06-02'].healthImported, true);
  assert.equal(Object.keys(merged).length, 2);
  assert.deepEqual(mergeHealthDays(merged, days, '2026-06-10'), merged);
});
