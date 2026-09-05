export function getApiBase(): string {
  const url = import.meta.env?.VITE_API_BASE_URL;
  if (
    !url ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1' &&
      url.includes('localhost'))
  ) {
    return '/api';
  }
  return url.replace(/\/$/, '');
}
