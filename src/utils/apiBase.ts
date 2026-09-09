export function getApiBase(): string {
  const url = import.meta.env?.VITE_API_BASE_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Si estamos en Vercel o en producción remota, usamos /api.
    // Pero si estamos probando en móvil usando la IP local (ej. 192.168.1.X) o localhost,
    // debemos apuntar al puerto del servidor backend (usualmente 3001).
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      return `http://${hostname}:3001/api`;
    }
  }
  if (!url) return '/api';
  return url.replace(/\/$/, '');
}
