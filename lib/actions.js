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
  updatePurchase,
  deletePurchase,
  createSale,
  updateSale,
  deleteSale,
  setSaleDelivered,
  addCreditPayment,
  getCommissionPercent,
  setCommissionPercent,
  recalculateCommissions,
  setCommissionPaid,
  createUser,
  setUserActive,
  resetUserPassword,
  createOrder,
  setOrderFulfilled,
  deleteOrder,
  createPanderoGroup,
  deletePanderoGroup,
  addPanderoEntry,
  setPanderoEntryFulfilled,
  deletePanderoEntry,
  createSupplier,
  deleteSupplier,
  upsertSupplierPrice,
  bulkUpsertSupplierPrices,
  deleteSupplierPrice,
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

export async function editPurchaseAction(id, prevState, formData) {
  await requireRole('admin');

  const quantity = Number(formData.get('quantity'));
  const unitCost = Number(formData.get('unitCost'));
  const freightRaw = String(formData.get('freightCost') || '').trim();
  const freightCost = freightRaw === '' ? 0 : Number(freightRaw);
  const marginRaw = String(formData.get('marginPerUnit') || '').trim();
  const marginPerUnit = marginRaw === '' ? null : Number(marginRaw);
  const note = String(formData.get('note') || '').trim();

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
    await updatePurchase(id, { quantity, unitCost, freightCost, marginPerUnit, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function deletePurchaseAction(id) {
  await requireRole('admin');
  await deletePurchase(id);
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
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

// ---------- Comisiones (configurar %: solo admin) ----------

export async function setCommissionPercentAction(prevState, formData) {
  await requireRole('admin');

  const percent = Number(formData.get('percent'));
  if (Number.isNaN(percent) || percent < 0 || percent > 100) {
    return { error: 'El porcentaje debe estar entre 0 y 100.' };
  }

  await setCommissionPercent(percent);
  await recalculateCommissions(percent);
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

// ---------- Pedidos (admin y vendedora) ----------

export async function createOrderAction(prevState, formData) {
  await requireRole('admin', 'vendedora');

  const perfumeId = Number(formData.get('perfumeId'));
  const customerName = String(formData.get('customerName') || '').trim();
  const quantity = Number(formData.get('quantity'));
  const note = String(formData.get('note') || '').trim();

  if (!perfumeId) return { error: 'Selecciona un perfume.' };
  if (!customerName) return { error: 'El nombre del cliente es obligatorio.' };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: 'La cantidad no es válida.' };
  }

  try {
    await createOrder({ perfumeId, customerName, quantity, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function setOrderFulfilledAction(id, fulfilled) {
  await requireRole('admin', 'vendedora');
  await setOrderFulfilled(id, fulfilled);
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
}

export async function deleteOrderAction(id) {
  await requireRole('admin', 'vendedora');
  await deleteOrder(id);
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
}

// ---------- Panderos (admin y vendedora) ----------

export async function createPanderoGroupAction(prevState, formData) {
  await requireRole('admin', 'vendedora');

  const name = String(formData.get('name') || '').trim();
  const startDate = String(formData.get('startDate') || '');
  const intervalDays = Number(formData.get('intervalDays'));

  if (!name) return { error: 'Ponle un nombre al pandero (ej: Pandero semanal).' };
  if (!startDate) return { error: 'Selecciona la fecha de inicio.' };
  if (!Number.isInteger(intervalDays) || intervalDays <= 0) {
    return { error: 'Los días entre turnos deben ser un número mayor a 0.' };
  }

  try {
    await createPanderoGroup({ name, startDate, intervalDays });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/panderos');
  return { error: null, success: true };
}

export async function deletePanderoGroupAction(id) {
  await requireRole('admin', 'vendedora');
  await deletePanderoGroup(id);
  revalidatePath('/admin/panderos');
}

export async function addPanderoEntryAction(groupId, prevState, formData) {
  await requireRole('admin', 'vendedora');

  const customerName = String(formData.get('customerName') || '').trim();
  const perfumeId = Number(formData.get('perfumeId'));

  if (!customerName) return { error: 'El nombre del participante es obligatorio.' };
  if (!perfumeId) return { error: 'Selecciona un perfume.' };

  try {
    await addPanderoEntry({ groupId, customerName, perfumeId });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/panderos');
  return { error: null, success: true };
}

export async function setPanderoEntryFulfilledAction(id, fulfilled) {
  await requireRole('admin', 'vendedora');
  await setPanderoEntryFulfilled(id, fulfilled);
  revalidatePath('/admin/panderos');
}

export async function deletePanderoEntryAction(id) {
  await requireRole('admin', 'vendedora');
  await deletePanderoEntry(id);
  revalidatePath('/admin/panderos');
}

// ---------- Proveedores (solo admin) ----------

export async function createSupplierAction(prevState, formData) {
  await requireRole('admin');

  const name = String(formData.get('name') || '').trim();
  const note = String(formData.get('note') || '').trim();
  if (!name) return { error: 'El nombre del proveedor es obligatorio.' };

  try {
    await createSupplier({ name, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/proveedores');
  return { error: null, success: true };
}

export async function deleteSupplierAction(id) {
  await requireRole('admin');
  await deleteSupplier(id);
  revalidatePath('/admin/proveedores');
}

export async function addSupplierPriceAction(supplierId, prevState, formData) {
  await requireRole('admin');

  const perfumeId = Number(formData.get('perfumeId'));
  const tierLabel = String(formData.get('tierLabel') || '').trim();
  const price = Number(formData.get('price'));

  if (!perfumeId) return { error: 'Selecciona un perfume.' };
  if (!tierLabel) return { error: 'Ponle un nombre al nivel de precio (ej: Por mayor, 5K).' };
  if (Number.isNaN(price) || price <= 0) return { error: 'El precio no es válido.' };

  try {
    await upsertSupplierPrice({ supplierId, perfumeId, tierLabel, price });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/proveedores');
  return { error: null, success: true };
}

export async function bulkAddSupplierPricesAction(supplierId, prevState, formData) {
  await requireRole('admin');

  const tierLabel = String(formData.get('tierLabel') || '').trim();
  const rawText = String(formData.get('rawText') || '');

  if (!tierLabel) return { error: 'Ponle un nombre al nivel de precio (ej: Por mayor, 5K).' };
  if (!rawText.trim()) return { error: 'Pega al menos una línea con producto y precio.' };

  let result;
  try {
    result = await bulkUpsertSupplierPrices({ supplierId, tierLabel, rawText });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/proveedores');
  return { error: null, success: true, result };
}

export async function deleteSupplierPriceAction(id) {
  await requireRole('admin');
  await deleteSupplierPrice(id);
  revalidatePath('/admin/proveedores');
}
