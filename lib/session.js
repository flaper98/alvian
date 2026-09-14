import { cookies } from 'next/headers';
import { COOKIE_NAME, getSessionRole, getSessionUser } from './auth';

/** Rol de la sesión actual ('admin' | 'vendedora'), o null si no hay sesión válida
 * o si falta configurar SESSION_SECRET. */
export async function getCurrentRole() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  try {
    return getSessionRole(session);
  } catch (error) {
    return null;
  }
}

/** { role, userId, name } de la sesión actual, o null si no hay sesión válida. */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  try {
    return getSessionUser(session);
  } catch (error) {
    return null;
  }
}
