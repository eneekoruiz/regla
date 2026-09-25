import serverModule from '../server/app.js';

const { createApp } = serverModule;

let productionApp;
function getProductionApp() {
  // Las pruebas nunca deben conectarse a una base de datos real, se lancen como se lancen.
  const isTestRun = process.env.npm_lifecycle_event === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
  if (isTestRun && !process.env.DATABASE_URL) return null;
  // Las credenciales solo llegan por el entorno del despliegue: sin ellas, el acceso queda cerrado.
  if (!(process.env.DATABASE_URL || process.env.POSTGRES_URL) || !process.env.JWT_SECRET) return null;

  if (!productionApp) {
    try {
      productionApp = createApp({ env: process.env });
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
