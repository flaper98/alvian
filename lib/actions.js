'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  ROLES,
  createSessionCookieValue,
  getSessionRole,
  getSessionUser,
  identifyUser,
  hashPassword,
} from './auth';
import {
  createPerfume,
  updatePerfume,
  deletePerfume,
  createPurchase,
  createSale,
  updateSale,
  deleteSale,
  setSaleDelivered,
  addCreditPayment,
  setCommission,
  setCommissionPaid,
  createUser,
  setUserActive,
  resetUserPassword,
} from './db';

async function requireRole(...allowedRoles) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const role = getSessionRole(session);
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('No autorizado.');
  }
  return role;
}

async function requireUser(...allowedRoles) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const user = getSessionUser(session);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('No autorizado.');
  }
  return user;
}

export async function loginAction(prevState, formData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  let identity;
  try {
    identity = await identifyUser(username, password);
  } catch (error) {
    return {
      error:
        'El sitio no está configurado correctamente (falta ADMIN_PASSWORD o SESSION_SECRET).',
    };
  }

  if (!identity) {
    return { error: 'Usuario o clave incorrectos.' };
  }

  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, createSessionCookieValue(identity), {
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

// ---------- Catálogo (solo admin) ----------

function parsePerfumeForm(formData) {
  const name = String(formData.get('name') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  const videoUrl = String(formData.get('videoUrl') || '').trim();
  const description = String(formData.get('description') || '').trim();
  // El precio es opcional al crear el producto: se puede definir después,
  // de forma automática, al registrar la primera compra (costo + ganancia).
  const price = priceRaw === '' ? 0 : Number(priceRaw);

  if (!name) throw new Error('El nombre es obligatorio.');
  if (Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido.');
  }
  if (!imageUrl) throw new Error('La imagen es obligatoria.');

  return { name, price, imageUrl, videoUrl, description };
}

export async function addPerfumeAction(prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parsePerfumeForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  try {
    await createPerfume(data);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function editPerfumeAction(id, prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parsePerfumeForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  try {
    await updatePerfume(id, data);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function deletePerfumeAction(id) {
  await requireRole('admin');
  await deletePerfume(id);
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/catalogo');
}

// ---------- Compras (solo admin) ----------

export async function registerPurchaseAction(prevState, formData) {
  await requireRole('admin');

  const perfumeId = Number(formData.get('perfumeId'));
  const quantity = Number(formData.get('quantity'));
  const unitCost = Number(formData.get('unitCost'));
  const freightRaw = String(formData.get('freightCost') || '').trim();
  const freightCost = freightRaw === '' ? 0 : Number(freightRaw);
  const marginRaw = String(formData.get('marginPerUnit') || '').trim();
  const marginPerUnit = marginRaw === '' ? null : Number(marginRaw);
  const note = String(formData.get('note') || '').trim();

  if (!perfumeId) return { error: 'Selecciona un perfume.' };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'La cantidad no es válida.' };
  }
  if (Number.isNaN(unitCost) || unitCost < 0) {
    return { error: 'El costo no es válido.' };
  }
  if (Number.isNaN(freightCost) || freightCost < 0) {
    return { error: 'El flete no es válido.' };
  }
  if (marginPerUnit !== null && (Number.isNaN(marginPerUnit) || marginPerUnit < 0)) {
    return { error: 'La ganancia por unidad no es válida.' };
  }

  try {
    await createPurchase({ perfumeId, quantity, unitCost, freightCost, marginPerUnit, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

// ---------- Ventas (admin y vendedora) ----------

export async function registerSaleAction(prevState, formData) {
  const user = await requireUser('admin', 'vendedora');

  const perfumeId = Number(formData.get('perfumeId'));
  const quantity = Number(formData.get('quantity'));
  const unitPrice = Number(formData.get('unitPrice'));
  const paymentType = String(formData.get('paymentType') || '');
  const customerName = String(formData.get('customerName') || '').trim();
  const delivered = formData.get('delivered') === 'on';

  if (!perfumeId) return { error: 'Selecciona un perfume.' };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'La cantidad no es válida.' };
  }
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    return { error: 'El precio no es válido.' };
  }
  if (!['contado', 'credito', 'pandero'].includes(paymentType)) {
    return { error: 'Selecciona una forma de pago.' };
  }
  if (['credito', 'pandero'].includes(paymentType) && !customerName) {
    return { error: 'El nombre del cliente es obligatorio para ventas a crédito o pandero.' };
  }

  try {
    await createSale({
      perfumeId,
      quantity,
      unitPrice,
      paymentType,
      customerName,
      soldByRole: user.role,
      soldByName: user.name,
      delivered,
    });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function editSaleAction(id, prevState, formData) {
  await requireRole('admin');

  const quantity = Number(formData.get('quantity'));
  const unitPrice = Number(formData.get('unitPrice'));
  const paymentType = String(formData.get('paymentType') || '');
  const customerName = String(formData.get('customerName') || '').trim();
  const soldByRaw = String(formData.get('soldBy') || '');

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'La cantidad no es válida.' };
  }
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    return { error: 'El precio no es válido.' };
  }
  if (!['contado', 'credito', 'pandero'].includes(paymentType)) {
    return { error: 'Selecciona una forma de pago.' };
  }
  if (['credito', 'pandero'].includes(paymentType) && !customerName) {
    return { error: 'El nombre del cliente es obligatorio para ventas a crédito o pandero.' };
  }

  let soldBy;
  try {
    soldBy = JSON.parse(soldByRaw);
  } catch (error) {
    soldBy = null;
  }
  if (!soldBy || !ROLES.includes(soldBy.role) || !soldBy.name) {
    return { error: 'Selecciona quién realizó la venta.' };
  }

  try {
    await updateSale(id, {
      quantity,
      unitPrice,
      paymentType,
      customerName,
      soldByRole: soldBy.role,
      soldByName: soldBy.name,
    });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function deleteSaleAction(id) {
  await requireRole('admin');
  await deleteSale(id);
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin/catalogo');
}

export async function setSaleDeliveredAction(id, delivered) {
  await requireRole('admin', 'vendedora');
  await setSaleDelivered(id, delivered);
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
}

// ---------- Crédito / pandero (admin y vendedora) ----------

export async function addCreditPaymentAction(prevState, formData) {
  await requireRole('admin', 'vendedora');

  const saleId = Number(formData.get('saleId'));
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').trim();

  if (!saleId) return { error: 'Venta inválida.' };
  if (Number.isNaN(amount) || amount <= 0) {
    return { error: 'El monto no es válido.' };
  }

  try {
    await addCreditPayment({ saleId, amount, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/creditos');
  revalidatePath('/admin');
  return { error: null, success: true };
}

// ---------- Comisiones (asignar: solo admin) ----------

export async function setCommissionAction(saleId, prevState, formData) {
  await requireRole('admin');

  const amountRaw = String(formData.get('commissionAmount') || '').trim();
  const amount = amountRaw === '' ? null : Number(amountRaw);
  if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
    return { error: 'El monto de comisión no es válido.' };
  }

  await setCommission(saleId, amount);
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function setCommissionPaidAction(saleId, paid) {
  await requireRole('admin');
  await setCommissionPaid(saleId, paid);
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin');
}

// ---------- Usuarios (solo admin) ----------

export async function createUserAction(prevState, formData) {
  await requireRole('admin');

  const username = String(formData.get('username') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();
  const role = String(formData.get('role') || '');

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      error: 'El usuario debe tener 3 a 32 caracteres (letras, números, punto, guion o guion bajo).',
    };
  }
  if (username === 'admin') {
    return { error: 'Ese nombre de usuario está reservado.' };
  }
  if (password.length < 6) {
    return { error: 'La clave debe tener al menos 6 caracteres.' };
  }
  if (!name) {
    return { error: 'El nombre es obligatorio.' };
  }
  if (!ROLES.includes(role)) {
    return { error: 'Selecciona un rol válido.' };
  }

  try {
    await createUser({ username, passwordHash: hashPassword(password), name, role });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/usuarios');
  return { error: null, success: true };
}

export async function setUserActiveAction(id, active) {
  await requireRole('admin');
  await setUserActive(id, active);
  revalidatePath('/admin/usuarios');
}

export async function resetUserPasswordAction(id, prevState, formData) {
  await requireRole('admin');

  const password = String(formData.get('password') || '');
  if (password.length < 6) {
    return { error: 'La clave debe tener al menos 6 caracteres.' };
  }

  await resetUserPassword(id, hashPassword(password));
  revalidatePath('/admin/usuarios');
  return { error: null, success: true };
}
