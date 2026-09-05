import { isObject, parseDataJSON } from '../utils/dataValidation';

export interface AuthUser { id: string; email: string }
export interface StoredSession { token: string; user: AuthUser }

export function isAuthUser(value: unknown): value is AuthUser {
  return isObject(value) && typeof value.id === 'string' && value.id.length > 0 && typeof value.email === 'string' && value.email.length > 0;
}

export function clearSessionStorage(): void {
  for (const key of ['token', 'cached_user', 'dev_bypass_auth']) localStorage.removeItem(key);
}

export async function resolveStoredSession(signal?: AbortSignal): Promise<StoredSession | null> {
  let token: string | null;
  let cachedUser: unknown;
  try {
    token = localStorage.getItem('token');
    const raw = localStorage.getItem('cached_user');
    try { cachedUser = raw ? parseDataJSON(raw) : null; } catch { cachedUser = null; }
    if (import.meta.env?.DEV && localStorage.getItem('dev_bypass_auth') === 'true') {
      return { token: 'dev-token', user: { id: 'development', email: 'dev@test.com' } };
    }
  } catch {
    return null;
  }
  if (!token || token === 'dev-token') return null;
  if (token.startsWith('local-') || token.startsWith('offline-')) {
    return isAuthUser(cachedUser) ? { token, user: cachedUser } : null;
  }
  try {
    const response = await fetch(`${import.meta.env?.VITE_API_BASE_URL || '/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000)
    });
    if (response.status === 401 || response.status === 403) {
      if (!signal?.aborted && localStorage.getItem('token') === token) clearSessionStorage();
      return null;
    }
    if (!response.ok) throw new Error('Servidor no disponible.');
    const data: unknown = await response.json();
    if (!isObject(data) || !isAuthUser(data.user)) return null;
    if (signal?.aborted || localStorage.getItem('token') !== token) return null;
    try { localStorage.setItem('cached_user', JSON.stringify(data.user)); } catch { /* Session still works in memory. */ }
    return { token, user: data.user };
  } catch {
    if (signal?.aborted || localStorage.getItem('token') !== token) return null;
    return isAuthUser(cachedUser) ? { token, user: cachedUser } : null;
  }
}
