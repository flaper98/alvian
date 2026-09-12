'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionCookieValue,
  isCorrectPassword,
  isValidSession,
} from './auth';
import { createPerfume, updatePerfume, deletePerfume } from './db';

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    throw new Error('No autorizado.');
  }
}

export async function loginAction(prevState, formData) {
  const password = formData.get('password');

  try {
    if (!isCorrectPassword(password)) {
      return { error: 'Clave incorrecta.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, createSessionCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
  } catch (error) {
    return {
      error:
        'El sitio no está configurado correctamente (falta ADMIN_PASSWORD o SESSION_SECRET).',
    };
  }

  revalidatePath('/admin');
  return { error: null };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  revalidatePath('/admin');
}

function parsePerfumeForm(formData) {
  const name = String(formData.get('name') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  const videoUrl = String(formData.get('videoUrl') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const price = Number(priceRaw);

  if (!name) throw new Error('El nombre es obligatorio.');
  if (!priceRaw || Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido.');
  }
  if (!imageUrl) throw new Error('La imagen es obligatoria.');

  return { name, price, imageUrl, videoUrl, description };
}

export async function addPerfumeAction(prevState, formData) {
  await requireAdmin();

  let data;
  try {
    data = parsePerfumeForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  await createPerfume(data);
  revalidatePath('/');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function editPerfumeAction(id, prevState, formData) {
  await requireAdmin();

  let data;
  try {
    data = parsePerfumeForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  await updatePerfume(id, data);
  revalidatePath('/');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function deletePerfumeAction(id) {
  await requireAdmin();
  await deletePerfume(id);
  revalidatePath('/');
  revalidatePath('/admin');
}
