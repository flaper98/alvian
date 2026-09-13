import { cookies } from 'next/headers';
import { COOKIE_NAME, getSessionRole } from './auth';

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
