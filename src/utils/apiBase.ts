export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // In production or on HTTPS (like Vercel), NEVER allow localhost to prevent ERR_CONNECTION_REFUSED
    if (!isLocalhost || isHttps) {
      return '/api';
    }
  }

  const url = import.meta.env?.VITE_API_BASE_URL;
  if (url && typeof url === 'string' && url.trim().length > 0) {
    const trimmed = url.trim().replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && trimmed.includes('localhost')) {
      return '/api';
    }
    return trimmed;
  }
  return '/api';
}
