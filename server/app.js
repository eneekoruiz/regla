const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { isObject, isSafeJson, credentials, emailAddress, resetPassword, dailyLog } = require('./validation');

const UNAVAILABLE = 'El acceso con cuenta no está disponible ahora. Puedes continuar en modo privado local.';
const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, auth_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date TEXT NOT NULL, is_period BOOLEAN DEFAULT FALSE, flow TEXT,
    symptoms JSONB DEFAULT '[]'::jsonb NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL, UNIQUE(user_id, date)
  );
  ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb NOT NULL;
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash CHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
  CREATE INDEX IF NOT EXISTS password_reset_tokens_active_idx
    ON password_reset_tokens (token_hash, expires_at) WHERE used_at IS NULL;
`;
const upsertLog = `INSERT INTO daily_logs (user_id, date, is_period, flow, symptoms, recorded_at, data)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT (user_id, date) DO UPDATE SET is_period = EXCLUDED.is_period,
  flow = EXCLUDED.flow, symptoms = EXCLUDED.symptoms, recorded_at = EXCLUDED.recorded_at, data = EXCLUDED.data
  WHERE daily_logs.recorded_at <= EXCLUDED.recorded_at`;
const logParams = (id, log) => [id, log.date, log.isPeriod, log.flow || null,
  JSON.stringify(log.symptoms), log.recordedAt, JSON.stringify(log)];

function databaseOptions(connectionString) {
  const url = new URL(connectionString);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  // pg can override SSL options from the URL, including disabling verification.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000, max: 5 };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function recoveryConfiguration(env) {
  const appUrl = String(env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  const from = String(env.MAIL_FROM || '').trim();
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  return appUrl.startsWith('https://') && from.length > 3 && apiKey.length > 20 ? { appUrl, from, apiKey } : null;
}

async function sendPasswordResetEmail(configuration, email, token) {
  const resetUrl = `${configuration.appUrl}/?reset=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${configuration.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: configuration.from,
      to: [email],
      subject: 'Recupera tu acceso a Aura',
      text: `Puedes restablecer tu contraseña de Aura en este enlace (válido durante 30 minutos): ${resetUrl}\n\nSi no lo solicitaste, ignora este mensaje.`,
      html: `<p>Puedes restablecer tu contraseña de Aura en este enlace:</p><p><a href="${escapeHtml(resetUrl)}">Restablecer contraseña</a></p><p>El enlace caduca en 30 minutos. Si no lo solicitaste, ignora este mensaje.</p>`
    }),
    signal: AbortSignal.timeout(8000)
  });
  return response.ok;
}

function createApp({ env = process.env, pool: suppliedPool, initialize = true, authLimit = 30 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Vercel terminates TLS before forwarding the request. This preserves the
  // original HTTPS protocol for same-origin checks and rate-limit client IPs.
  app.set('trust proxy', 1);
  const secret = env.JWT_SECRET || '';
  const secretReady = secret.length >= 32 && !/dev_jwt_secret|change_in_production/i.test(secret);
  let pool = suppliedPool;
  if (!pool && env.DATABASE_URL && secretReady) {
    try { pool = new Pool(databaseOptions(env.DATABASE_URL)); } catch { /* Disabled until configured. */ }
  }
  const configured = Boolean(pool && secretReady);
  let ready = false;
  let initialization;
  const ensureReady = async () => {
    if (!configured) return false;
    if (ready) return true;
    if (!initialization) initialization = (async () => {
      try {
        if (initialize) await pool.query(schema);
        ready = true;
        return true;
      } catch {
        return false;
      } finally {
        initialization = null;
      }
    })();
    return initialization;
  };
  if (pool?.on) pool.on('error', () => { ready = false; });
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
  if (env.NODE_ENV !== 'production') {
    for (const host of ['localhost', '127.0.0.1']) {
      for (const port of [5173, 5174]) allowedOrigins.add(`http://${host}:${port}`);
    }
  }
  app.use((req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' });
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}` && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Origen no permitido.' });
    }
    next();
  });
  app.use(cors({ origin: true, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));

  const attempts = new Map();
  app.use('/api/auth', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    let entry = attempts.get(key);
    if (!entry) {
      if (attempts.size >= 10000) return res.status(429).json({ error: 'Demasiados intentos. Inténtalo más tarde.' });
      entry = { count: 0, until: now + 15 * 60 * 1000 };
      attempts.set(key, entry);
    }
    if (++entry.count > authLimit) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos antes de volver a probar.' });
    }
    next();
  });
  app.use(express.json({ limit: '256kb', strict: true }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', authentication: configured ? 'configured' : 'unavailable' }));
  app.get('/api/ready', async (req, res) => {
    const databaseReady = await ensureReady();
    const recoveryReady = Boolean(recoveryConfiguration(env));
    const readyForProduction = databaseReady && recoveryReady;
    res.status(readyForProduction ? 200 : 503).json({
      status: readyForProduction ? 'ready' : 'unavailable',
      database: databaseReady ? 'ready' : 'unavailable',
      recovery: recoveryReady ? 'configured' : 'unavailable'
    });
  });

  async function requireDatabase(req, res, next) {
    if (!await ensureReady()) return res.status(503).json({ error: UNAVAILABLE });
    next();
  }
  function signUser(user) {
    return { token: jwt.sign({ id: user.id, version: Number(user.auth_version || 0) }, secret, { algorithm: 'HS256',
      expiresIn: '7d', issuer: 'aura', audience: 'aura-app' }),
    user: { id: String(user.id), email: user.email } };
  }
  const dummyHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
  app.post('/api/auth/login', requireDatabase, async (req, res) => {
    const input = credentials(req.body);
    if (!input) return res.status(400).json({ error: 'Revisa el correo y la contraseña.' });
    const result = await pool.query('SELECT id, email, password_hash, auth_version FROM users WHERE lower(email) = $1', [input.email]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(input.password, user?.password_hash || dummyHash);
    if (!user || !valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    res.json(signUser(user));
  });
  app.post('/api/auth/signup', requireDatabase, async (req, res) => {
    const input = credentials(req.body, true);
    if (!input) return res.status(400).json({ error: 'Usa un correo válido y una contraseña de al menos 12 caracteres y hasta 72 bytes.' });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize normalized email registrations, including legacy mixed-case accounts.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.email]);
      const existing = await client.query('SELECT id FROM users WHERE lower(email) = $1', [input.email]);
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'No se ha podido crear la cuenta con este correo. Prueba a iniciar sesión.' });
      }
      const result = await client.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, auth_version', [input.email, passwordHash]);
      const user = result.rows[0];
      await client.query('INSERT INTO profiles (user_id, settings) VALUES ($1, $2)', [user.id, '{}']);
      await client.query('COMMIT');
      res.status(201).json(signUser(user));
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') return res.status(409).json({ error: 'No se ha podido crear la cuenta con este correo.' });
      throw error;
    } finally { client.release(); }
  });

  app.post('/api/auth/forgot_password', requireDatabase, async (req, res) => {
    const email = emailAddress(req.body);
    const mail = recoveryConfiguration(env);
    if (!email || !mail) return res.status(mail ? 400 : 503).json({
      error: mail ? 'Revisa el correo electrónico.' : 'La recuperación por correo no está configurada. No se ha enviado ningún enlace.'
    });
    const result = await pool.query('SELECT id, email FROM users WHERE lower(email) = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(202).json({ accepted: true });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= CURRENT_TIMESTAMP', [user.id]);
    await pool.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 minutes')", [user.id, tokenHash]);
    let sent = false;
    try { sent = await sendPasswordResetEmail(mail, user.email, rawToken); } catch { sent = false; }
    if (!sent) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]).catch(() => {});
      return res.status(503).json({ error: 'No se ha podido enviar el correo de recuperación. Inténtalo más tarde.' });
    }
    return res.status(202).json({ accepted: true });
  });

  app.post('/api/auth/reset_password', requireDatabase, async (req, res) => {
    const input = resetPassword(req.body);
    if (!input) return res.status(400).json({ error: 'El enlace o la nueva contraseña no son válidos.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(`SELECT user_id FROM password_reset_tokens
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`, [sha256(input.token)]);
      const row = result.rows[0];
      if (!row) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'El enlace ha caducado o ya se ha utilizado. Solicita otro.' });
      }
      const passwordHash = await bcrypt.hash(input.password, 12);
      await client.query('UPDATE users SET password_hash = $1, auth_version = auth_version + 1 WHERE id = $2', [passwordHash, row.user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1', [row.user_id]);
      await client.query('COMMIT');
      return res.json({ reset: true });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });

  async function authenticate(req, res, next) {
    const match = /^Bearer (\S+)$/i.exec(req.get('authorization') || '');
    if (!match || match[1].length > 4096) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    if (!await ensureReady()) return res.status(503).json({ error: UNAVAILABLE });
    let payload;
    try {
      payload = jwt.verify(match[1], secret, { algorithms: ['HS256'], issuer: 'aura', audience: 'aura-app' });
      if (!isObject(payload) || !Number.isSafeInteger(payload.id) || payload.id < 1) throw new Error('Invalid subject');
    } catch { return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' }); }
    const result = await pool.query('SELECT id, email, auth_version FROM users WHERE id = $1', [payload.id]);
    if (!result.rows.length) return res.status(401).json({ error: 'La cuenta ya no está disponible.' });
    if (payload.version !== undefined && payload.version !== Number(result.rows[0].auth_version || 0)) return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' });
    req.user = result.rows[0];
    next();
  }
  app.get('/api/auth/me', authenticate, (req, res) => res.json({ user: { id: String(req.user.id), email: req.user.email } }));
  app.get('/api/logs', authenticate, async (req, res) => {
    const result = await pool.query('SELECT date, is_period, flow, symptoms, recorded_at, data FROM daily_logs WHERE user_id = $1 ORDER BY date', [req.user.id]);
    res.json(result.rows);
  });
  app.post('/api/logs', authenticate, async (req, res) => {
    const log = dailyLog(req.body);
    if (!log) return res.status(400).json({ error: 'El registro contiene datos no válidos.' });
    await pool.query(upsertLog, logParams(req.user.id, log));
    res.json({ saved: true });
  });
  app.post('/api/logs/bulk', authenticate, async (req, res) => {
    if (!isObject(req.body) || !Array.isArray(req.body.logs) || req.body.logs.length > 1000) {
      return res.status(400).json({ error: 'Envía un máximo de 1000 registros por lote.' });
    }
    const logs = req.body.logs.map(dailyLog);
    if (logs.some(log => !log)) return res.status(400).json({ error: 'El lote contiene registros no válidos.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const log of logs) await client.query(upsertLog, logParams(req.user.id, log));
      await client.query('COMMIT');
      res.json({ saved: logs.length });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  });
  app.delete('/api/logs', authenticate, async (req, res) => {
    await pool.query('DELETE FROM daily_logs WHERE user_id = $1', [req.user.id]);
    res.json({ deleted: true });
  });
  app.get('/api/settings', authenticate, async (req, res) => {
    const result = await pool.query('SELECT settings FROM profiles WHERE user_id = $1', [req.user.id]);
    res.json(result.rows[0]?.settings || {});
  });
  app.post('/api/settings', authenticate, async (req, res) => {
    if (!isObject(req.body) || !isSafeJson(req.body)) return res.status(400).json({ error: 'Ajustes no válidos.' });
    await pool.query(`INSERT INTO profiles (user_id, settings) VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings`, [req.user.id, JSON.stringify(req.body)]);
    res.json({ saved: true });
  });
  app.delete('/api/settings', authenticate, async (req, res) => {
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [req.user.id]);
    res.json({ deleted: true });
  });
  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido.' });
    res.status(503).json({ error: 'No se ha podido completar la operación. Inténtalo de nuevo.' });
  });
  return app;
}

module.exports = { createApp, databaseOptions, schema };
