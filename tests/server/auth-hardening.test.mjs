import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import api from '../../api/index.js';
const require = createRequire(new URL('../../server/app.js', import.meta.url));
const { createApp, databaseOptions } = require('./app');
const { credentials, dailyLog, isSafeJson } = require('./validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const secret = 'test-only-secret-with-more-than-thirty-two-bytes';
const env = { NODE_ENV: 'production', JWT_SECRET: secret };

async function fixture(t, options = {}) {
  const server = createApp({ env, initialize: false, ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return (path, init = {}) => fetch('http://127.0.0.1:' + server.address().port + path, {
    ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
}
const token = (id = 1) => jwt.sign({ id }, secret, { algorithm: 'HS256', expiresIn: '1h', issuer: 'aura', audience: 'aura-app' });
const bearer = value => ({ Authorization: 'Bearer ' + value });
const userPool = extra => ({ query: async (sql, params) => sql.startsWith('SELECT id, email, auth_version FROM users WHERE id')
  ? { rows: [{ id: params[0], email: 'user@example.test', auth_version: 0 }] } : extra ? extra(sql, params) : { rows: [] } });

test('credentials and records reject invalid types, overflow, impossible dates and prototype keys', () => {
  assert.equal(credentials(null), null);
  assert.equal(credentials({ email: {}, password: [] }), null);
  assert.equal(credentials({ email: 'x@y.test', password: 'é'.repeat(37) }, true), null);
  assert.deepEqual(credentials({ email: '  A@EXAMPLE.TEST ', password: 'long passphrase' }, true), { email: 'a@example.test', password: 'long passphrase' });
  assert.equal(dailyLog({ date: '2026-02-30', isPeriod: false, symptoms: [] }), null);
  assert.equal(dailyLog({ date: '2026-09-04', isPeriod: 'false', symptoms: [] }), null);
  assert.equal(isSafeJson(JSON.parse('{"__proto__":{"polluted":true}}')), false);
  assert.equal(dailyLog({ date: '2026-09-04', isPeriod: false, symptoms: [], notes: 'kept' }).notes, 'kept');
  const options = databaseOptions('postgres://user:pass@db.example.test/aura?sslmode=no-verify');
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(new URL(options.connectionString).searchParams.has('sslmode'), false);
});

test('unconfigured auth fails closed, recovery does not claim an email and unknown routes are 404', async t => {
  const request = await fixture(t, { env: {} });
  assert.equal((await request('/api/auth/login', { method: 'POST', body: '{}' })).status, 503);
  assert.equal((await request('/api/auth/me')).status, 401);
  const recovery = await request('/api/auth/forgot_password', { method: 'POST', body: '{}' });
  assert.equal(recovery.status, 503);
  assert.match((await recovery.json()).error, /no está disponible/);
  assert.equal((await request('/api/missing')).status, 404);
  const health = await request('/api/health');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal((await health.json()).authentication, 'unavailable');
  assert.equal((await request('/api/ready')).status, 503);
});

test('configured recovery sends a single-use reset link without exposing account existence', async t => {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.resend.com/emails') return previousFetch(url, init);
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  t.after(() => { globalThis.fetch = previousFetch; });
  const pool = { query: async (sql, params) => {
    if (sql.startsWith('SELECT id, email FROM users')) return { rows: [{ id: 9, email: params[0] }] };
    return { rows: [] };
  } };
  const recoveryEnv = { ...env, PUBLIC_APP_URL: 'https://aura.example.com', RESEND_API_KEY: 're_123456789012345678901234', MAIL_FROM: 'Aura <no-reply@aura.example.com>' };
  const request = await fixture(t, { env: recoveryEnv, pool });
  const response = await request('/api/auth/forgot_password', { method: 'POST', body: JSON.stringify({ email: 'User@example.test' }) });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.match(calls[0].body.text, /aura\.example\.com\/\?reset=/);
  const unknown = await request('/api/auth/forgot_password', { method: 'POST', body: JSON.stringify({ email: 'unknown@example.test' }) });
  assert.equal(unknown.status, 202);
  assert.deepEqual(await unknown.json(), { accepted: true });
});

test('reset password consumes the token and increments the session version', async t => {
  const calls = [];
  const pool = { connect: async () => ({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT user_id FROM password_reset_tokens')) return { rows: [{ user_id: 9 }] };
      return { rows: [] };
    },
    release: () => calls.push({ sql: 'release' })
  }) };
  const recoveryEnv = { ...env, PUBLIC_APP_URL: 'https://aura.example.com', RESEND_API_KEY: 're_123456789012345678901234', MAIL_FROM: 'Aura <no-reply@aura.example.com>' };
  const request = await fixture(t, { env: recoveryEnv, pool });
  const response = await request('/api/auth/reset_password', { method: 'POST', body: JSON.stringify({ token: 'A'.repeat(43), password: 'a new secure passphrase' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reset: true });
  assert.ok(calls.some(entry => entry.sql.startsWith('UPDATE users SET password_hash')));
  assert.ok(calls.some(entry => entry.sql.startsWith('UPDATE password_reset_tokens')));
  assert.equal(calls.at(-1).sql, 'release');
});

test('origins, malformed JSON, oversized bodies and brute force are rejected', async t => {
  const request = await fixture(t, { authLimit: 2 });
  assert.equal((await request('/api/health', { headers: { Origin: 'https://attacker.test' } })).status, 403);
  assert.equal((await request('/api/logs', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await request('/api/logs', { method: 'POST', body: JSON.stringify({ data: 'a'.repeat(270000) }) })).status, 413);
  for (let count = 0; count < 2; count++) await request('/api/auth/login', { method: 'POST', body: '{}' });
  const response = await request('/api/auth/login', { method: 'POST', body: '{}' });
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});

test('local, forged, expired and wrong-audience tokens are not backend sessions', async t => {
  const request = await fixture(t, { pool: userPool() });
  const invalid = ['local-session', 'dev-token',
    jwt.sign({ id: 1 }, 'wrong-secret'),
    jwt.sign({ id: 1 }, secret, { expiresIn: -1, issuer: 'aura', audience: 'aura-app' }),
    jwt.sign({ id: 1 }, secret, { expiresIn: '1h', issuer: 'aura', audience: 'another-app' })];
  for (const value of invalid) assert.equal((await request('/api/auth/me', { headers: bearer(value) })).status, 401);
  const response = await request('/api/auth/me', { headers: bearer(token()) });
  assert.deepEqual(await response.json(), { user: { id: '1', email: 'user@example.test' } });
});

test('login preserves normalized identity and issues a real scoped JWT', async t => {
  const password = 'test passphrase';
  const hash = await bcrypt.hash(password, 10);
  const pool = { query: async (sql, params) => {
    assert.equal(params[0], 'user@example.test');
    return { rows: [{ id: 4, email: 'user@example.test', password_hash: hash }] };
  } };
  const request = await fixture(t, { pool });
  const good = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ' USER@EXAMPLE.TEST ', password }) });
  assert.equal(good.status, 200);
  const result = await good.json();
  assert.equal(result.user.id, '4');
  assert.equal(jwt.verify(result.token, secret, { issuer: 'aura', audience: 'aura-app', algorithms: ['HS256'] }).id, 4);
  const bad = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'user@example.test', password: 'wrong' }) });
  assert.equal(bad.status, 401);
});

test('log writes use the authenticated owner and preserve full payload, rejecting invalid batches', async t => {
  const calls = [];
  const pool = userPool(async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; });
  const request = await fixture(t, { pool });
  const log = { date: '2026-09-04', isPeriod: true, symptoms: [], notes: 'Retained note', biomarkers: { bbt: 36.5 }, user_id: 99 };
  const saved = await request('/api/logs', { method: 'POST', headers: bearer(token(7)), body: JSON.stringify(log) });
  assert.equal(saved.status, 200);
  assert.equal(calls[0].params[0], 7);
  assert.match(calls[0].sql, /WHERE daily_logs\.recorded_at <= EXCLUDED\.recorded_at/);
  assert.equal(JSON.parse(calls[0].params[6]).notes, log.notes);
  assert.deepEqual(JSON.parse(calls[0].params[6]).biomarkers, log.biomarkers);
  const invalid = await request('/api/logs/bulk', { method: 'POST', headers: bearer(token()), body: JSON.stringify({ logs: [{ ...log, date: 'invalid' }] }) });
  assert.equal(invalid.status, 400);
});

test('bulk errors roll back and release their database client', async t => {
  const calls = [];
  const pool = { ...userPool(), connect: async () => ({
    query: async sql => { calls.push(sql); if (sql.startsWith('INSERT')) throw new Error('Database failure with private detail'); },
    release: () => calls.push('release')
  }) };
  const request = await fixture(t, { pool });
  const response = await request('/api/logs/bulk', { method: 'POST', headers: bearer(token()), body: JSON.stringify({ logs: [{ date: '2026-09-04', isPeriod: false, symptoms: [] }] }) });
  assert.equal(response.status, 503);
  assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'release']);
  assert.doesNotMatch(await response.text(), /private detail/);
});

test('Vercel never acknowledges fictional auth or writes', () => {
  for (const [path, method, expected] of [
    ['/api/auth/login', 'POST', 503], ['/api/auth/signup', 'POST', 503], ['/api/auth/reset_password', 'POST', 503], ['/api/ready', 'GET', 503], ['/api/auth/me', 'GET', 401],
    ['/api/logs', 'POST', 503], ['/api/settings', 'DELETE', 503], ['/api/missing', 'GET', 404],
    ['/api/health', 'GET', 200], ['/api/auth/login', 'GET', 405]
  ]) {
    let status;
    let body;
    const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { body = value; return this; }, end() {} };
    api({ method, url: path, headers: {} }, res);
    assert.equal(status, expected, path);
    assert.equal(body?.token, undefined);
    assert.equal(body?.saved, undefined);
  }
});
