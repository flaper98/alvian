import crypto from 'crypto';
import { findUserByUsername } from './db';

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
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ---------- Contraseñas (hash con scrypt, sin dependencias externas) ----------

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = crypto.scryptSync(password, salt, 64);
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, suppliedBuffer);
}

// ---------- Sesión (payload JSON firmado, codificado en base64url) ----------

function encodePayload(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodePayload(encoded) {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}

export function createSessionCookieValue({ role, userId, name }) {
  if (!ROLES.includes(role)) {
    throw new Error(`Rol de sesión inválido: ${role}`);
  }
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = encodePayload({ role, userId: userId ?? null, name: name || null, expiresAt });
  return `${payload}.${sign(payload)}`;
}

function parseSession(value) {
  if (!value) return null;
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  if (!timingSafeEqual(signature, sign(payload))) return null;

  let data;
  try {
    data = decodePayload(payload);
  } catch (error) {
    return null;
  }

  if (!data || !ROLES.includes(data.role)) return null;
  if (!data.expiresAt || Date.now() >= Number(data.expiresAt)) return null;

  return data;
}

/** Devuelve el rol ('admin' | 'vendedora') de una cookie de sesión válida, o null. */
export function getSessionRole(value) {
  return parseSession(value)?.role ?? null;
}

/** Devuelve { role, userId, name } de una cookie de sesión válida, o null. */
export function getSessionUser(value) {
  const data = parseSession(value);
  if (!data) return null;
  return { role: data.role, userId: data.userId, name: data.name };
}

/**
 * Identifica quién inicia sesión con usuario + clave.
 * - "admin" con ADMIN_PASSWORD siempre funciona (acceso de respaldo del dueño).
 * - Cualquier otro usuario se valida contra la tabla `users` (creada desde el panel).
 */
export async function identifyUser(username, password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Falta configurar la variable de entorno ADMIN_PASSWORD.');
  }

  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
    return null;
  }
  const normalizedUsername = username.trim().toLowerCase();

  // "admin" es un nombre de usuario reservado (nunca se puede crear en la tabla
  // `users`, ver createUserAction): se resuelve solo contra ADMIN_PASSWORD y
  // nunca cae a la consulta de base de datos, ni siquiera si la clave es incorrecta.
  if (normalizedUsername === 'admin') {
    return timingSafeEqual(password, adminPassword)
      ? { role: 'admin', userId: null, name: 'Admin' }
      : null;
  }

  const user = await findUserByUsername(normalizedUsername);
  if (!user || !user.active) return null;
  if (!verifyPassword(password, user.password_hash)) return null;

  return { role: user.role, userId: user.id, name: user.name };
}
