/** Real PostgreSQL integration check. Uses only disposable synthetic accounts. */
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import dotenv from 'dotenv';
const require = createRequire(import.meta.url);
const { createApp, databaseOptions } = require('../server/app.js');
const { Pool } = require('pg');
const env = { ...dotenv.parse(fs.readFileSync(process.env.AURA_ENV_FILE || '.env')), ...process.env };
if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool(databaseOptions(env.DATABASE_URL));
const secret = randomBytes(48).toString('base64url');
const emails = [0, 1].map(i => `aura-qa-${randomUUID()}-${i}@example.invalid`);
const password = randomBytes(30).toString('base64url');
const server = createApp({ env: { ...env, JWT_SECRET: secret }, pool }).listen(0, '127.0.0.1');
await once(server, 'listening');
const request = async (path, { token, body, method = body ? 'POST' : 'GET' } = {}) => {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
};
try {
  const sessions = [];
  for (const email of emails) {
    const signup = await request('/auth/signup', { body: { email, password } });
    assert.equal(signup.status, 201, 'Signup must create a real account');
    const login = await request('/auth/login', { body: { email, password } });
    assert.equal(login.status, 200);
    sessions.push(login.data.token);
    const me = await request('/auth/me', { token: login.data.token });
    assert.equal(me.data.user.email, email);
  }
  assert.equal((await request('/auth/login', { body: { email: emails[0], password: 'wrong-password' } })).status, 401);
  const log = { date: '2026-09-01', isPeriod: false, symptoms: [], notes: 'Synthetic integration check', recordedAt: new Date().toISOString() };
  assert.equal((await request('/logs/bulk', { token: sessions[0], body: { logs: [log] } })).status, 200);
  const saved = await request('/logs', { token: sessions[0] });
  assert.equal(saved.data[0].data.notes, log.notes);
  assert.deepEqual((await request('/logs', { token: sessions[1] })).data, []);
  assert.equal((await request('/logs')).status, 401);
  console.log('PASS: real database signup, login, session validation, wrong password, persistent records and account isolation.');
} finally {
  // Delete only the exact disposable accounts created by this invocation.
  await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await pool.end();
}
