import { cookies } from 'next/headers';
import { COOKIE_NAME, getActiveSessionUser } from './auth';

/** Rol de la sesión actual ('admin' | 'vendedora'), o null si no hay sesión válida,
 * si el usuario fue desactivado o si falta configurar SESSION_SECRET. */
export async function getCurrentRole() {
  return (await getCurrentUser())?.role ?? null;
}

/** { role, userId, name } de la sesión actual, o null si no hay sesión válida. */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  try {
    return await getActiveSessionUser(session);
  } catch (error) {
    return null;
  }
}
