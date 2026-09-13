import crypto from 'crypto';

export const COOKIE_NAME = 'alvian_admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días
export const ROLES = ['admin', 'vendedora'];

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

export function createSessionCookieValue(role) {
  if (!ROLES.includes(role)) {
    throw new Error(`Rol de sesión inválido: ${role}`);
  }
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${role}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

/** Devuelve el rol ('admin' | 'vendedora') de una cookie de sesión válida, o null. */
export function getSessionRole(value) {
  if (!value) return null;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);

  if (!timingSafeEqual(signature, sign(payload))) return null;

  const match = payload.match(/^(admin|vendedora)\.(\d+)$/);
  if (!match) return null;

  const [, role, expiresAt] = match;
  if (Date.now() >= Number(expiresAt)) return null;

  return role;
}

/** Devuelve el rol cuya clave coincide con `candidate`, o null si ninguna coincide. */
export function identifyRole(candidate) {
  if (typeof candidate !== 'string' || !candidate) return null;

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Falta configurar la variable de entorno ADMIN_PASSWORD.');
  }
  if (timingSafeEqual(candidate, adminPassword)) return 'admin';

  const sellerPassword = process.env.SELLER_PASSWORD;
  if (sellerPassword && timingSafeEqual(candidate, sellerPassword)) return 'vendedora';

  return null;
}
