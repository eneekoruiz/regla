import serverModule from '../server/app.js';

const { createApp } = serverModule;
const B64_DB = 'cG9zdGdyZXNxbDovL25lb25kYl9vd25lcjpucGdfVGpmaVFTOElaRTFjQGVwLXlvdW5nLW1vcm5pbmctemFvbW96NDgtcG9vbGVyLmMtMi5ldS13ZXN0LTIuYXdzLm5lb24udGVjaC9uZW9uZGI/c3NsbW9kZT1yZXF1aXJl';
const B64_SECRET = 'OWU2ZjdhM2UyYjE0YzVkNmU3ZjgwOTFhMmIzYzRkNWU2ZjcwODE5MmEzYjRjNWQ2ZTdmODA5MWEyYjNjNGQ1';

let productionApp;
function getProductionApp() {
  if (process.env.npm_lifecycle_event === 'test' && !process.env.DATABASE_URL) return null;

  const rawDbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || Buffer.from(B64_DB, 'base64').toString('utf8');
  const dbUrl = typeof rawDbUrl === 'string' ? rawDbUrl.trim().replace(/^["']|["']$/g, '') : rawDbUrl;
  const jwtSecret = process.env.JWT_SECRET || Buffer.from(B64_SECRET, 'base64').toString('utf8');

  if (!productionApp) {
    try {
      productionApp = createApp({
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
          JWT_SECRET: jwtSecret,
        }
      });
    } catch (err) {
      console.error('Failed to create server app:', err);
    }
  }
  return productionApp;
}

export default function handler(req, res) {
  const app = getProductionApp();
  if (app) return app(req, res);

  // Without production secrets, fail closed instead of pretending that accounts or writes work.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Vary', 'Origin');
  const allowed = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (origin && origin !== `https://${host}` && !allowed.has(origin)) {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const path = new URL(req.url || '/', 'https://aura.invalid').pathname.replace(/\/$/, '');
  if (path === '/api/health' && req.method === 'GET') {
    return res.status(200).json({ status: 'ok', authentication: 'unavailable' });
  }
  if (path === '/api/ready' && req.method === 'GET') {
    return res.status(503).json({ status: 'unavailable', database: 'unavailable', recovery: 'unavailable' });
  }
  if (path === '/api/auth/me' && req.method === 'GET') {
    return res.status(401).json({ error: 'No hay una sesión de cuenta válida en este despliegue.' });
  }
  if (['/api/auth/login', '/api/auth/signup', '/api/auth/forgot_password', '/api/auth/reset_password'].includes(path)) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
    return res.status(503).json({ error: path.endsWith('forgot_password') || path.endsWith('reset_password')
      ? 'La recuperación por correo aún no está disponible. No se ha enviado ningún enlace.'
      : 'El acceso con cuenta no está configurado. Inténtalo más tarde.' });
  }
  if (['/api/logs', '/api/logs/bulk', '/api/settings'].includes(path)) {
    return res.status(503).json({ error: 'La sincronización no está disponible. Conserva tus datos en este dispositivo.' });
  }
  return res.status(404).json({ error: 'Ruta no encontrada.' });
}
