'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { COOKIE_NAME, getActiveSessionUser } from './auth';
import { normalizeOrderCode, normalizeOrderNumber } from './shalom';
import { createShipment, updateShipment, setShipmentStatus, deleteShipment } from './shalom-db';

async function requireUser(...allowedRoles) {
  const cookieStore = await cookies();
  const user = await getActiveSessionUser(cookieStore.get(COOKIE_NAME)?.value);
  if (!user || !allowedRoles.includes(user.role)) throw new Error('No autorizado.');
  return user;
}

const text = (formData, key, max = 200) =>
  String(formData.get(key) || '')
    .trim()
    .slice(0, max);

function parseShipmentForm(formData) {
  return {
    direction: text(formData, 'direction', 20),
    orderNumber: normalizeOrderNumber(text(formData, 'orderNumber', 30)),
    orderCode: normalizeOrderCode(text(formData, 'orderCode', 20)),
    status: text(formData, 'status', 20),
    contactName: text(formData, 'contactName', 120),
    contactPhone: text(formData, 'contactPhone', 20).replace(/\D/g, ''),
    origin: text(formData, 'origin', 120),
    destination: text(formData, 'destination', 120),
    note: text(formData, 'note', 500),
    webOrderId: Number(formData.get('webOrderId')) || null,
    supplierId: Number(formData.get('supplierId')) || null,
  };
}

function revalidateShipments() {
  revalidatePath('/admin/envios');
  revalidatePath('/admin/pedidos-web');
  revalidatePath('/admin');
}

export async function createShipmentAction(prevState, formData) {
  try {
    await requireUser('admin', 'vendedora');
    await createShipment(parseShipmentForm(formData));
  } catch (error) {
    return { error: error.message };
  }
  revalidateShipments();
  return { error: null, success: true };
}

export async function updateShipmentAction(id, prevState, formData) {
  try {
    await requireUser('admin', 'vendedora');
    await updateShipment(id, parseShipmentForm(formData));
  } catch (error) {
    return { error: error.message };
  }
  revalidateShipments();
  return { error: null, success: true };
}

export async function setShipmentStatusAction(id, prevState, formData) {
  try {
    await requireUser('admin', 'vendedora');
    await setShipmentStatus(id, text(formData, 'status', 20), text(formData, 'note', 300));
  } catch (error) {
    return { error: error.message };
  }
  revalidateShipments();
  return { error: null, success: true };
}

export async function deleteShipmentAction(id) {
  try {
    await requireUser('admin');
    await deleteShipment(id);
  } catch (error) {
    return { error: error.message || 'No se pudo eliminar el envío.' };
  }
  revalidateShipments();
  return { error: null };
}
