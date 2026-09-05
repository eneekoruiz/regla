const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function isSafeJson(value, depth = 0) {
  if (depth > 12) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= 20000;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 1000 && value.every(item => isSafeJson(item, depth + 1));
  return isObject(value) && Object.entries(value).every(([key, item]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) && isSafeJson(item, depth + 1));
}

function credentials(body, signup = false) {
  if (!isObject(body) || typeof body.email !== 'string' || typeof body.password !== 'string') return null;
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  // bcrypt ignores bytes after 72; reject rather than silently truncate credentials.
  if (body.password.length < (signup ? 12 : 1) || Buffer.byteLength(body.password, 'utf8') > 72) return null;
  return { email, password: body.password };
}

function emailAddress(body) {
  if (!isObject(body) || typeof body.email !== 'string') return null;
  const email = body.email.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function resetPassword(body) {
  if (!isObject(body) || typeof body.token !== 'string' || typeof body.password !== 'string') return null;
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(body.token)) return null;
  if (body.password.length < 12 || Buffer.byteLength(body.password, 'utf8') > 72) return null;
  return { token: body.token, password: body.password };
}

function dailyLog(value) {
  if (!isObject(value) || !isSafeJson(value)) return null;
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null;
  const date = new Date(`${value.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.date) return null;
  if (typeof value.isPeriod !== 'boolean') return null;
  if (value.flow != null && !['spotting', 'light', 'medium', 'heavy', 'very_heavy'].includes(value.flow)) return null;
  if (!Array.isArray(value.symptoms) || value.symptoms.length > 100) return null;
  if (!value.symptoms.every(s => isObject(s) && typeof s.id === 'string' && s.id.length <= 150 &&
    typeof s.name === 'string' && s.name.length <= 300 && typeof s.category === 'string')) return null;
  if (value.recordedAt != null && (typeof value.recordedAt !== 'string' || !Number.isFinite(Date.parse(value.recordedAt)))) return null;
  return { ...value, recordedAt: value.recordedAt || new Date().toISOString() };
}

module.exports = { isObject, isSafeJson, credentials, emailAddress, resetPassword, dailyLog };
