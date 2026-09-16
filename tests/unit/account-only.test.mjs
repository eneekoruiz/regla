import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStoredSession } from '../../src/services/authSession.ts';

test('retired anonymous and development sessions cannot open the diary; records remain recoverable', async () => {
  const previous = globalThis.localStorage;
  try {
    for (const token of ['local-session', 'local-qa', 'offline-session', 'dev-token']) {
      const values = new Map([['token', token], ['cached_user', JSON.stringify({ id: 'old', email: 'old@example.test' })], ['regla_daily_logs_v1', '{"retained":true}']]);
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
      assert.equal(await resolveStoredSession(), null);
      assert.equal(values.has('token'), false);
      assert.equal(values.get('regla_daily_logs_v1'), '{"retained":true}');
    }
  } finally { globalThis.localStorage = previous; }
});
