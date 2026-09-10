export function getApiBase(): string {
  const url = import.meta.env?.VITE_API_BASE_URL;
  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url.trim().replace(/\/$/, '');
  }
  return '/api';
}
