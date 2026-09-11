import crypto from 'crypto';

export const COOKIE_NAME = 'alvian_admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Falta configurar la variable de entorno SESSION_SECRET.');
  }
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionCookieValue() {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSession(value) {
  if (!value) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return false;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);

  if (!timingSafeEqual(signature, sign(payload))) return false;

  const match = payload.match(/^admin\.(\d+)$/);
  if (!match) return false;

  return Date.now() < Number(match[1]);
}

export function isCorrectPassword(candidate) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Falta configurar la variable de entorno ADMIN_PASSWORD.');
  }
  if (typeof candidate !== 'string' || !candidate) return false;
  return timingSafeEqual(candidate, password);
}
