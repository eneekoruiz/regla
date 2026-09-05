import { createRequire } from 'node:module';

let productionApp;
function getProductionApp() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) return null;
  if (!productionApp) {
    const require = createRequire(import.meta.url);
    const { createApp } = require('../server/app.js');
    productionApp = createApp();
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
      : 'El acceso con cuenta no está configurado. Puedes continuar en modo privado local.' });
  }
  if (['/api/logs', '/api/logs/bulk', '/api/settings'].includes(path)) {
    return res.status(503).json({ error: 'La sincronización no está disponible. Conserva tus datos en este dispositivo.' });
  }
  return res.status(404).json({ error: 'Ruta no encontrada.' });
}
