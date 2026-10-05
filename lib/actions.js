'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { slugify } from './slug';
import { PF_CATEGORY_KEYS, PF_MANUAL_OUTFLOW_CATEGORIES } from './profit-first';
import { EXPENSE_CATEGORY_KEYS } from './expense-categories';
import { isValidCashPurpose } from './cash-purposes';
import { installmentPlan } from './loans.mjs';
import {
  COOKIE_NAME,
  SESSION_MAX_AGE,
  ROLES,
  createSessionCookieValue,
  getActiveSessionUser,
  identifyUser,
  hashPassword,
} from './auth';
import {
  createPerfume,
  updatePerfume,
  deletePerfume,
  bulkUpdatePerfumeDescriptions,
  createHeroBanner,
  updateHeroBanner,
  setHeroBannerActive,
  deleteHeroBanner,
  moveHeroBanner,
  createPurchase,
  updatePurchase,
  deletePurchase,
  createExpense,
  updateExpense,
  deleteExpense,
  createCashMovement,
  createStockLoss,
  deleteStockLoss,
  savePfPlan,
  setPfBase,
  createPfOutflow,
  deletePfOutflow,
  deleteCashMovement,
  createSale,
  updateSale,
  deleteSale,
  setSaleDelivered,
  addCreditPayment,
  getCommissionPercent,
  setCommissionPercent,
  recalculateCommissions,
  payAvailableCommission,
  resetCommissionPayment,
  createUser,
  setUserActive,
  resetUserPassword,
  createOrderBatch,
  updateOrder,
  receiveOrdersToStock,
  setOrderFulfilled,
  deleteOrder,
  createPanderoGroup,
  deletePanderoGroup,
  addPanderoEntry,
  setPanderoEntryFulfilled,
  setPanderoEntryPaying,
  updatePanderoEntry,
  setPanderoRoundPayers,
  deletePanderoEntry,
  createSupplier,
  deleteSupplier,
  upsertSupplierPrice,
  bulkUpsertSupplierPrices,
  deleteSupplierPrice,
  addMissingSupplierProductsToCatalog,
  createDebt,
  updateDebt,
  deleteDebt,
  addDebtPayment,
  deleteDebtPayment,
  payAllAvailableCommissions,
  createSalesBatch,
  saveDistributionConfig,
  createEnvelopeMovement,
  deleteEnvelopeMovement,
  getPricingConfig,
  savePricingConfig,
  setPerfumePrices,
  setPriceLocked,
  autoPriceAfterCostChange,
  countRecentLoginFailures,
  recordLoginFailure,
  clearLoginFailures,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCK_MINUTES,
  saveDecantConfig,
  updatePerfumeDecantSettings,
  openBottleForDecants,
  setDecantMl,
} from './db';

async function requireRole(...allowedRoles) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const role = (await getActiveSessionUser(session))?.role;
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('No autorizado.');
  }
  return role;
}

async function requireUser(...allowedRoles) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  const user = await getActiveSessionUser(session);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('No autorizado.');
  }
  return user;
}

// En producción Next.js oculta el mensaje de los errores que lanza una acción
// del servidor (el usuario solo ve "Minified React error #441"). Para las
// acciones que se llaman desde un botón, devolvemos el error como dato para
// que la pantalla pueda mostrar el motivo real.
async function safely(work) {
  try {
    await work();
    return { error: null };
  } catch (error) {
    return { error: error.message || 'No se pudo completar la acción.' };
  }
}

export async function loginAction(prevState, formData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  // Contra quien prueba claves: tras LOGIN_MAX_FAILURES intentos fallidos con
  // ese usuario o desde esa conexión, se bloquea LOGIN_LOCK_MINUTES minutos.
  const ip = ((await headers()).get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida';
  const attemptKeys = [`u:${username.toLowerCase().slice(0, 60)}`, `ip:${ip.slice(0, 60)}`];
  const lockedMessage = `Demasiados intentos fallidos. Espera ${LOGIN_LOCK_MINUTES} minutos y vuelve a probar.`;
  try {
    if ((await countRecentLoginFailures(attemptKeys)) >= LOGIN_MAX_FAILURES) return { error: lockedMessage };
  } catch (error) {
    // Si la base no responde, el inicio de sesión sigue (con la pausa de abajo).
  }

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
    // Pequeña pausa en cada intento fallido: frena los ataques de fuerza bruta
    // sin molestar a quien se equivocó una vez.
    await new Promise((resolve) => setTimeout(resolve, 800));
    let failures = 0;
    try {
      await recordLoginFailure(attemptKeys);
      failures = await countRecentLoginFailures(attemptKeys);
    } catch (error) {
      failures = 0;
    }
    if (failures >= LOGIN_MAX_FAILURES) return { error: lockedMessage };
    const left = LOGIN_MAX_FAILURES - failures;
    return {
      error:
        failures >= 2
          ? `Usuario o clave incorrectos. Te queda${left === 1 ? '' : 'n'} ${left} intento${left === 1 ? '' : 's'}.`
          : 'Usuario o clave incorrectos.',
    };
  }
  await clearLoginFailures(attemptKeys).catch(() => {});

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

const PERFUME_CATEGORIES = ['hombre', 'mujer', 'unisex'];

function parsePerfumeForm(formData) {
  const name = String(formData.get('name') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  const videoUrl = String(formData.get('videoUrl') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const category = String(formData.get('category') || '').trim();
  // El precio es opcional al crear el producto: se puede definir después,
  // de forma automática, al registrar la primera compra (costo + ganancia).
  const price = priceRaw === '' ? 0 : Number(priceRaw);

  if (!name) throw new Error('El nombre es obligatorio.');
  if (Number.isNaN(price) || price < 0) {
    throw new Error('El precio no es válido.');
  }
  if (!imageUrl) throw new Error('La imagen es obligatoria.');
  if (category && !PERFUME_CATEGORIES.includes(category)) {
    throw new Error('La categoría no es válida.');
  }

  const comparePriceRaw = String(formData.get('comparePrice') || '').trim();
  const comparePrice = comparePriceRaw === '' ? null : Number(comparePriceRaw);
  if (comparePrice !== null && (Number.isNaN(comparePrice) || comparePrice < 0)) {
    throw new Error('El precio anterior no es válido.');
  }
  const featured = formData.get('featured') === 'on';
  const notes = String(formData.get('notes') || '').trim().slice(0, 200);
  const brand = String(formData.get('brand') || '').trim().slice(0, 60);

  return { name, brand, price, imageUrl, videoUrl, description, category, comparePrice, featured, notes };
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

  revalidatePath('/', 'layout');
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

  const stock = Number(formData.get('stock'));
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: 'El stock debe ser un número entero de 0 o más.' };
  }

  try {
    await updatePerfume(id, { ...data, stock });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function bulkUpdateDescriptionsAction(prevState, formData) {
  await requireRole('admin');

  const rawText = String(formData.get('rawText') || '');
  if (!rawText.trim()) {
    return { error: 'Pega al menos una línea con "Nombre: descripción".' };
  }

  let result;
  try {
    result = await bulkUpdatePerfumeDescriptions(rawText);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true, result };
}

export async function deletePerfumeAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deletePerfume(id);
  });
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/catalogo');
  return result;
}

// ---------- Banners del carrusel de inicio (solo admin) ----------

function parseHeroBannerForm(formData) {
  const imageUrl = String(formData.get('imageUrl') || '').trim();
  const altText = String(formData.get('altText') || '').trim();
  const perfumeSelection = String(formData.get('perfumeSelection') || '').trim();
  const customLink = String(formData.get('linkUrl') || '').trim();

  if (!imageUrl) throw new Error('La imagen es obligatoria.');
  if (!altText) throw new Error('El texto alternativo es obligatorio (para accesibilidad y SEO).');

  // Si eligieron un perfume del selector, el enlace se arma solo (mismo
  // patrón que usa la tarjeta de perfume en la tienda: /perfume/<slug>).
  // Si no, se usa lo que hayan escrito a mano en "enlace personalizado".
  let linkUrl = customLink;
  if (perfumeSelection === '__catalogo__') {
    linkUrl = '#catalogo';
  } else if (perfumeSelection) {
    linkUrl = `/perfume/${slugify(perfumeSelection)}`;
  }

  return { imageUrl, altText, linkUrl };
}

export async function createHeroBannerAction(prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parseHeroBannerForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  try {
    await createHeroBanner(data);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/banners');
  return { error: null, success: true };
}

export async function updateHeroBannerAction(id, prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parseHeroBannerForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  try {
    await updateHeroBanner(id, data);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/banners');
  return { error: null, success: true };
}

export async function setHeroBannerActiveAction(id, active) {
  const result = await safely(async () => {
    await requireRole('admin');
    await setHeroBannerActive(id, active);
  });
  revalidatePath('/', 'layout');
  revalidatePath('/admin/banners');
  return result;
}

export async function deleteHeroBannerAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteHeroBanner(id);
  });
  revalidatePath('/', 'layout');
  revalidatePath('/admin/banners');
  return result;
}

export async function moveHeroBannerAction(id, direction) {
  const result = await safely(async () => {
    await requireRole('admin');
    await moveHeroBanner(id, direction);
  });
  revalidatePath('/admin/banners');
  return result;
}

// Con qué dinero se pagó una compra o un gasto.
const PAID_WITH = ['capital', 'ganancias'];
const PAID_WITH_ERROR = 'Elige si lo pagaste con tu capital o con las ganancias.';

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
  const paidWith = String(formData.get('paidWith') || '');
  const note = String(formData.get('note') || '').trim();

  if (!perfumeId) return { error: 'Selecciona un perfume.' };
  if (!PAID_WITH.includes(paidWith)) return { error: PAID_WITH_ERROR };
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
    await createPurchase({ perfumeId, quantity, unitCost, freightCost, marginPerUnit, note, paidWith });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
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
  const paidWith = String(formData.get('paidWith') || '');
  if (!PAID_WITH.includes(paidWith)) return { error: PAID_WITH_ERROR };
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
    await updatePurchase(id, { quantity, unitCost, freightCost, marginPerUnit, note, paidWith });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function deletePurchaseAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deletePurchase(id);
  });
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
  return result;
}

// ---------- Gastos extras (solo admin) ----------

function parseExpenseForm(formData) {
  const description = String(formData.get('description') || '').trim();
  const amount = Number(formData.get('amount'));
  const paidWith = String(formData.get('paidWith') || '');
  const note = String(formData.get('note') || '').trim();

  const category = String(formData.get('category') || '');

  if (!description) throw new Error('La descripción es obligatoria.');
  if (Number.isNaN(amount) || amount <= 0) throw new Error('El monto no es válido.');
  if (!PAID_WITH.includes(paidWith)) throw new Error(PAID_WITH_ERROR);
  if (!EXPENSE_CATEGORY_KEYS.includes(category)) throw new Error('Elige la categoría del gasto.');

  return { description, amount, note, paidWith, category };
}

export async function registerExpenseAction(prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parseExpenseForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  await createExpense(data);
  revalidatePath('/admin');
  revalidatePath('/admin/gastos');
  revalidatePath('/admin/caja');
  return { error: null, success: true };
}

export async function editExpenseAction(id, prevState, formData) {
  await requireRole('admin');

  let data;
  try {
    data = parseExpenseForm(formData);
  } catch (error) {
    return { error: error.message };
  }

  await updateExpense(id, data);
  revalidatePath('/admin');
  revalidatePath('/admin/gastos');
  revalidatePath('/admin/caja');
  return { error: null, success: true };
}

export async function deleteExpenseAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteExpense(id);
  });
  revalidatePath('/admin');
  revalidatePath('/admin/gastos');
  revalidatePath('/admin/caja');
  return result;
}

// ---------- Pérdidas de producto (solo admin) ----------

function revalidateLosses() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/perdidas');
  revalidatePath('/admin/catalogo');
}

export async function registerStockLossAction(prevState, formData) {
  await requireRole('admin');

  const perfumeId = Number(formData.get('perfumeId'));
  const quantity = Number(formData.get('quantity'));
  const reason = String(formData.get('reason') || '');
  const note = String(formData.get('note') || '').trim().slice(0, 300);
  const date = String(formData.get('date') || '').trim();

  if (!perfumeId) return { error: 'Elige el perfume.' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'La cantidad no es válida.' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'La fecha no es válida.' };

  try {
    // Mediodía de Lima para que la fecha no cambie de día por la zona horaria.
    await createStockLoss({
      perfumeId,
      quantity,
      reason,
      note,
      occurredAt: date ? `${date}T12:00:00-05:00` : null,
    });
  } catch (error) {
    return { error: error.message };
  }
  revalidateLosses();
  return { error: null, success: true };
}

export async function deleteStockLossAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteStockLoss(id);
  });
  revalidateLosses();
  return result;
}

// ---------- Caja: aportes y retiros (solo admin) ----------

export async function registerCashMovementAction(prevState, formData) {
  await requireRole('admin');

  const kind = String(formData.get('kind') || '');
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').trim();
  const date = String(formData.get('date') || '').trim();

  const purpose = String(formData.get('purpose') || '');

  if (!['aporte', 'retiro'].includes(kind)) return { error: 'Elige si pones o sacas dinero.' };
  if (Number.isNaN(amount) || amount <= 0) return { error: 'El monto no es válido.' };
  if (!isValidCashPurpose(kind, purpose)) return { error: 'Elige para qué es el dinero.' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'La fecha no es válida.' };

  try {
    // Mediodía de Lima para que la fecha no cambie de día por la zona horaria.
    await createCashMovement({ kind, amount, note, purpose, occurredAt: date ? `${date}T12:00:00-05:00` : null });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin');
  revalidatePath('/admin/caja');
  return { error: null, success: true };
}

export async function deleteCashMovementAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteCashMovement(id);
  });
  revalidatePath('/admin');
  revalidatePath('/admin/caja');
  return result;
}

// ---------- Reparto tipo Profit First (solo admin) ----------

export async function savePfPlanAction(prevState, formData) {
  await requireRole('admin');

  const percents = {};
  for (const key of PF_CATEGORY_KEYS) {
    percents[key] = Number(formData.get(`percent_${key}`));
  }
  const mode = formData.get('mode') === 'todo' ? 'todo' : 'hoy';

  try {
    await savePfPlan({ percents, mode });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/profit-first');
  return { error: null, success: true };
}

export async function setPfBaseAction(base) {
  const result = await safely(async () => {
    await requireRole('admin');
    await setPfBase(base);
  });
  revalidatePath('/admin/profit-first');
  return result;
}

export async function registerPfOutflowAction(prevState, formData) {
  await requireRole('admin');

  const category = String(formData.get('category') || '');
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').trim();
  const date = String(formData.get('date') || '').trim();

  if (!PF_MANUAL_OUTFLOW_CATEGORIES.includes(category)) return { error: 'Elige una categoría.' };
  if (Number.isNaN(amount) || amount <= 0) return { error: 'El monto no es válido.' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'La fecha no es válida.' };

  try {
    await createPfOutflow({ category, amount, note, occurredAt: date ? `${date}T12:00:00-05:00` : null });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/profit-first');
  return { error: null, success: true };
}

export async function deletePfOutflowAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deletePfOutflow(id);
  });
  revalidatePath('/admin/profit-first');
  return result;
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

  revalidatePath('/', 'layout');
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

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin/catalogo');
  return { error: null, success: true };
}

export async function deleteSaleAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteSale(id);
  });
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin/catalogo');
  return result;
}

export async function setSaleDeliveredAction(id, delivered) {
  const result = await safely(async () => {
    await requireRole('admin', 'vendedora');
    await setSaleDelivered(id, delivered);
  });
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  return result;
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

export async function payAvailableCommissionAction(saleId) {
  const result = await safely(async () => {
    await requireRole('admin');
    await payAvailableCommission(saleId);
  });
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin');
  return result;
}

export async function resetCommissionPaymentAction(saleId) {
  const result = await safely(async () => {
    await requireRole('admin');
    await resetCommissionPayment(saleId);
  });
  revalidatePath('/admin/comisiones');
  revalidatePath('/admin');
  return result;
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

  const customerName = String(formData.get('customerName') || '').trim();
  const note = String(formData.get('note') || '').trim();
  const perfumeIds = formData.getAll('perfumeId').map(Number);
  const quantities = formData.getAll('quantity').map(Number);

  if (!customerName) return { error: 'El nombre del cliente es obligatorio.' };
  if (perfumeIds.length === 0) return { error: 'Agrega al menos un perfume.' };

  const items = perfumeIds.map((perfumeId, index) => ({ perfumeId, quantity: quantities[index] }));
  for (const item of items) {
    if (!item.perfumeId) return { error: 'Selecciona un perfume válido en cada fila.' };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { error: 'La cantidad no es válida en alguna fila.' };
    }
  }

  try {
    await createOrderBatch({ customerName, note, items });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function updateOrderAction(id, prevState, formData) {
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
    await updateOrder(id, { perfumeId, customerName, quantity, note });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  return { error: null, success: true };
}

export async function receiveOrdersToStockAction(prevState, formData) {
  await requireRole('admin');

  const orderIds = formData.getAll('orderId').map(Number).filter(Boolean);
  if (orderIds.length === 0) return { error: 'Marca al menos un pedido para ingresar a stock.' };
  const paidWith = String(formData.get('paidWith') || '');
  if (!PAID_WITH.includes(paidWith)) return { error: PAID_WITH_ERROR };

  const lines = [];
  for (const orderId of orderIds) {
    const unitCost = Number(formData.get(`cost_${orderId}`));
    if (Number.isNaN(unitCost) || unitCost < 0) {
      return { error: 'Revisa el costo unitario: debe ser un número válido.' };
    }
    lines.push({ orderId, unitCost });
  }

  try {
    await receiveOrdersToStock(lines, paidWith);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/pedidos');
  revalidatePath('/admin/compras');
  revalidatePath('/admin/catalogo');
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
  const result = await safely(async () => {
    const user = await requireUser('admin', 'vendedora');
    await setPanderoEntryFulfilled(id, fulfilled, { soldByRole: user.role, soldByName: user.name });
  });
  revalidatePath('/admin/panderos');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/comisiones');
  return result;
}

export async function setPanderoEntryPayingAction(id, paying) {
  await requireRole('admin', 'vendedora');
  await setPanderoEntryPaying(id, paying);
  revalidatePath('/admin/panderos');
}

export async function updatePanderoEntryAction(id, prevState, formData) {
  await requireRole('admin', 'vendedora');

  const customerName = String(formData.get('customerName') || '').trim();
  const perfumeId = Number(formData.get('perfumeId'));

  if (!customerName) return { error: 'El nombre del participante es obligatorio.' };
  if (!perfumeId) return { error: 'Selecciona un perfume.' };

  try {
    await updatePanderoEntry(id, { customerName, perfumeId });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/panderos');
  return { error: null, success: true };
}

export async function setPanderoRoundPayersAction(roundEntryId, prevState, formData) {
  await requireRole('admin', 'vendedora');

  const payerEntryIds = formData.getAll('payerId').map(Number).filter(Boolean);

  try {
    await setPanderoRoundPayers(roundEntryId, payerEntryIds);
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/panderos');
  revalidatePath('/admin');
  return { error: null, success: true };
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
  // Si nunca lo compraste, su costo es el del proveedor: el precio automático se revisa.
  const repriced = await autoPriceAfterCostChange([perfumeId]);

  if (repriced !== null) revalidatePath('/', 'layout');
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
  if (result.matched.length) {
    await autoPriceAfterCostChange(result.matched.map((m) => m.perfumeId));
    revalidatePath('/', 'layout');
  }

  revalidatePath('/admin/proveedores');
  return { error: null, success: true, result };
}

export async function deleteSupplierPriceAction(id) {
  await requireRole('admin');
  await deleteSupplierPrice(id);
  revalidatePath('/admin/proveedores');
}

/** Alta masiva al catálogo desde los precios de proveedores (Proveedores → Comparar). */
export async function addMissingSupplierProductsAction(prevState, formData) {
  await requireRole('admin');

  // "regla": precio con tu margen limpio %; "fija": costo + ganancia en soles.
  const useRule = formData.get('priceMode') === 'regla';
  const margin = Number(formData.get('margin') || 0);
  if (!useRule && (!Number.isFinite(margin) || margin < 0)) {
    return { error: 'La ganancia por perfume debe ser un número de 0 o más.' };
  }
  const updateExisting = formData.get('updateExisting') === 'on';

  let result;
  try {
    result = await addMissingSupplierProductsToCatalog({ margin, updateExisting, useRule });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin/catalogo');
  revalidatePath('/admin/proveedores');
  return { error: null, success: true, result };
}

// ---------- Precios automáticos (solo admin) ----------

const MAX_PRICE_UPDATES = 2000;

/** [{ id, price }] de la vista previa → solo ids y precios válidos (precio a céntimos). */
function parsePriceUpdates(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, MAX_PRICE_UPDATES)
    .map((item) => ({ id: Number(item?.id), price: Math.round(Number(item?.price) * 100) / 100 }))
    .filter(({ id, price }) => Number.isInteger(id) && id > 0 && Number.isFinite(price) && price > 0 && price < 100000);
}

/**
 * Guarda tu regla de precios y, si mandas `prices` (lo que ves en la vista
 * previa), cambia esos precios en la tienda. Devuelve cuántos cambiaron.
 */
export async function savePricingAction({ marginPercent, rounding, auto, prices } = {}) {
  let applied = 0;
  const result = await safely(async () => {
    await requireRole('admin');
    const config = await savePricingConfig({ marginPercent, rounding, auto: Boolean(auto) });
    applied = await setPerfumePrices(parsePriceUpdates(prices), config.rounding);
  });
  revalidatePath('/', 'layout');
  return { ...result, applied };
}

/** Pone a un perfume el precio sugerido (o el que elijas) desde la lista de Precios. */
export async function applyPriceAction(id, price) {
  const result = await safely(async () => {
    await requireRole('admin');
    const [update] = parsePriceUpdates([{ id, price }]);
    if (!update) throw new Error('El precio no es válido.');
    const { rounding } = await getPricingConfig();
    await setPerfumePrices([update], rounding);
  });
  revalidatePath('/', 'layout');
  return result;
}

/** Precio fijo: la automatización no lo cambia. */
export async function setPriceLockAction(id, locked) {
  const result = await safely(async () => {
    await requireRole('admin');
    await setPriceLocked(Number(id), Boolean(locked));
  });
  revalidatePath('/admin/precios');
  revalidatePath('/admin/catalogo');
  return result;
}

// ---------- Decants (solo admin) ----------

/** Tamaños de decant con el costo de su envase y el margen limpio de decants. */
export async function saveDecantConfigAction({ sizes, marginPercent } = {}) {
  const result = await safely(async () => {
    await requireRole('admin');
    await saveDecantConfig({ sizes, marginPercent });
  });
  revalidatePath('/', 'layout');
  return result;
}

/** ml del frasco y si el perfume vende decants en la tienda. */
export async function updateDecantSettingsAction(id, { volumeMl, enabled } = {}) {
  const result = await safely(async () => {
    await requireRole('admin');
    const ml = Number(volumeMl);
    if (!Number.isInteger(ml) || ml < 1 || ml > 1000) throw new Error('Los ml del frasco deben ser entre 1 y 1000.');
    await updatePerfumeDecantSettings(Number(id), { volumeMl: ml, enabled: Boolean(enabled) });
  });
  revalidatePath('/', 'layout');
  return result;
}

/** Abre un frasco para decants: sale 1 del stock y sus ml quedan para llenar decants. */
export async function openBottleAction(id) {
  let opened = null;
  const result = await safely(async () => {
    await requireRole('admin');
    opened = await openBottleForDecants(Number(id));
  });
  revalidatePath('/', 'layout');
  return { ...result, opened };
}

/** Corrige los ml que quedan para decants (probadores, lo derramado…). */
export async function setDecantMlAction(id, ml) {
  const result = await safely(async () => {
    await requireRole('admin');
    const value = Math.round(Number(ml) * 100) / 100;
    if (!Number.isFinite(value) || value < 0 || value > 100000) throw new Error('Los ml no son válidos.');
    await setDecantMl(Number(id), value);
  });
  revalidatePath('/', 'layout');
  return result;
}

// ---------- Deudas (solo admin) ----------

function revalidatePayments() {
  revalidatePath('/admin');
  revalidatePath('/admin/deudas');
  revalidatePath('/admin/caja');
  revalidatePath('/admin/plan');
  revalidatePath('/admin/distribucion');
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Deuda simple (total y fecha límite) o préstamo en cuotas (lo prestado, número
 * de cuotas, cuota y primer cobro: el total y la última fecha se calculan).
 */
function parseDebtForm(formData) {
  const creditor = String(formData.get('creditor') || '').trim().slice(0, 120);
  const description = String(formData.get('description') || '').trim().slice(0, 300);
  const fundsInvestment = formData.get('fundsInvestment') === 'on';
  if (!creditor) throw new Error('Escribe a quién le debes.');

  if (formData.get('kind') === 'prestamo') {
    const principal = Number(formData.get('principal'));
    const installments = Number(formData.get('installments'));
    const installmentAmount = Number(formData.get('installmentAmount'));
    const firstDueDate = String(formData.get('firstDueDate') || '').trim();
    if (!Number.isFinite(principal) || principal <= 0) throw new Error('Escribe cuánto te prestaron.');
    if (!Number.isInteger(installments) || installments < 1 || installments > 120) {
      throw new Error('El número de cuotas debe ser entre 1 y 120.');
    }
    if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) throw new Error('El monto de la cuota no es válido.');
    if (!ISO_DAY.test(firstDueDate)) throw new Error('Elige la fecha del primer cobro.');
    const plan = installmentPlan({ installments, installmentAmount, firstDueDate });
    if (plan.total < principal) {
      throw new Error(
        `Las ${installments} cuotas suman S/ ${plan.total.toFixed(2)}, menos de lo que te prestaron. Revisa el monto de la cuota.`,
      );
    }
    return {
      creditor,
      description,
      total: plan.total,
      dueDate: plan.lastDueDate,
      principal,
      installments,
      installmentAmount,
      firstDueDate,
      fundsInvestment,
    };
  }

  const total = Number(formData.get('total'));
  const dueDate = String(formData.get('dueDate') || '').trim();
  if (!Number.isFinite(total) || total <= 0) throw new Error('El monto de la deuda no es válido.');
  if (dueDate && !ISO_DAY.test(dueDate)) throw new Error('La fecha límite no es válida.');
  return { creditor, description, total, dueDate: dueDate || null, fundsInvestment };
}

export async function createDebtAction(prevState, formData) {
  await requireRole('admin');
  try {
    await createDebt(parseDebtForm(formData));
  } catch (error) {
    return { error: error.message };
  }
  revalidatePayments();
  return { error: null, success: true };
}

export async function updateDebtAction(id, prevState, formData) {
  await requireRole('admin');
  try {
    await updateDebt(id, parseDebtForm(formData));
  } catch (error) {
    return { error: error.message };
  }
  revalidatePayments();
  return { error: null, success: true };
}

export async function deleteDebtAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteDebt(id);
  });
  revalidatePayments();
  return result;
}

export async function addDebtPaymentAction(debtId, prevState, formData) {
  await requireRole('admin');
  const amount = Number(formData.get('amount'));
  const paidWith = String(formData.get('paidWith') || '');
  const note = String(formData.get('note') || '').trim().slice(0, 200);
  const date = String(formData.get('date') || '').trim();
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'El monto no es válido.' };
  if (!PAID_WITH.includes(paidWith)) return { error: PAID_WITH_ERROR };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'La fecha no es válida.' };
  try {
    // Mediodía de Lima para que la fecha no cambie de día por la zona horaria.
    await addDebtPayment({ debtId, amount, paidWith, note, paidAt: date ? `${date}T12:00:00-05:00` : null });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePayments();
  return { error: null, success: true };
}

export async function deleteDebtPaymentAction(id) {
  const result = await safely(async () => {
    await requireRole('admin');
    await deleteDebtPayment(id);
  });
  revalidatePayments();
  return result;
}

// ---------- Caja (solo admin) ----------

function revalidateCash() {
  revalidatePath('/admin');
  revalidatePath('/admin/caja');
  revalidatePath('/admin/gastos');
  revalidatePath('/admin/caja');
  revalidatePath('/admin/deudas');
  revalidatePath('/admin/comisiones');
}

/** Paga de una vez a la vendedora toda la comisión que ya puede cobrar. */
export async function payAllCommissionsAction() {
  let paid = 0;
  const result = await safely(async () => {
    await requireRole('admin');
    paid = await payAllAvailableCommissions();
    if (paid <= 0) throw new Error('No hay comisión por pagar: los clientes todavía no han pagado esas ventas.');
  });
  revalidateCash();
  return { ...result, paid };
}

// Movimientos que se pueden borrar desde la lista de la Caja. Ventas, abonos,
// compras y comisiones se corrigen en su propia sección (afectan stock o ventas).
const CASH_ENTRY_DELETERS = {
  gasto: deleteExpense,
  retiro: deleteCashMovement,
  aporte: deleteCashMovement,
  deuda: deleteDebtPayment,
  reparto: deletePfOutflow,
  sobre: deleteEnvelopeMovement,
};

export async function deleteCashEntryAction(src, ref) {
  const result = await safely(async () => {
    await requireRole('admin');
    const remove = CASH_ENTRY_DELETERS[src];
    if (!remove) throw new Error('Este movimiento se corrige en su propia sección.');
    await remove(Number(ref));
  });
  revalidateCash();
  return result;
}

/** Pago de deuda desde la Caja: la deuda se elige en el mismo formulario. */
export async function payDebtFromCashAction(prevState, formData) {
  const debtId = Number(formData.get('debtId'));
  if (!debtId) return { error: 'Elige qué deuda pagaste.' };
  return addDebtPaymentAction(debtId, prevState, formData);
}

// ---------- Venta rápida (admin y vendedora) ----------

/** Una venta con uno o varios perfumes; si es a crédito, puede llevar un abono inicial. */
export async function registerQuickSaleAction(prevState, formData) {
  const user = await requireUser('admin', 'vendedora');

  let items = [];
  try {
    const parsed = JSON.parse(String(formData.get('items') || '[]'));
    items = (Array.isArray(parsed) ? parsed : [])
      .map((i) => ({
        perfumeId: Number(i.perfumeId),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        // Decant de N ml (vacío = frasco completo).
        decantMl: Number(i.decantMl) > 0 && Number(i.decantMl) <= 100 ? Number(i.decantMl) : null,
      }))
      .slice(0, 30);
  } catch (error) {
    items = [];
  }
  const paymentType = String(formData.get('paymentType') || '');
  const customerName = String(formData.get('customerName') || '').trim().slice(0, 120);
  const delivered = formData.get('delivered') === 'on';
  const initialPayment = Number(formData.get('initialPayment') || 0);
  const logistics = Number(formData.get('logistics') || 0);
  const otherCosts = Number(formData.get('otherCosts') || 0);

  if (items.length === 0) return { error: 'Agrega al menos un perfume.' };
  for (const item of items) {
    if (!item.perfumeId) return { error: 'Uno de los perfumes no es válido.' };
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return { error: 'Revisa las cantidades.' };
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) return { error: 'Revisa los precios.' };
  }
  if (!['contado', 'credito', 'pandero'].includes(paymentType)) return { error: 'Elige cómo paga.' };
  if (['credito', 'pandero'].includes(paymentType) && !customerName) {
    return { error: 'Escribe el nombre del cliente (es obligatorio en crédito y pandero).' };
  }
  if (!Number.isFinite(initialPayment) || initialPayment < 0) return { error: 'El monto a cuenta no es válido.' };
  if (!Number.isFinite(logistics) || logistics < 0) return { error: 'El costo de envío no es válido.' };
  if (!Number.isFinite(otherCosts) || otherCosts < 0) return { error: 'El otro gasto no es válido.' };

  try {
    await createSalesBatch({
      items,
      paymentType,
      customerName,
      soldByRole: user.role,
      soldByName: user.name,
      delivered,
      initialPayment,
      logistics,
      otherCosts,
    });
  } catch (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/creditos');
  revalidatePath('/admin/catalogo');
  revalidatePath('/admin/caja');
  return { error: null, success: true, count: items.length };
}

// ---------- Distribución de ganancias (solo admin) ----------

function revalidateDistribution() {
  revalidatePath('/admin');
  revalidatePath('/admin/caja');
  revalidatePath('/admin/distribucion');
}

/** Porcentajes de la distribución. Solo afectan a las ventas nuevas. */
export async function saveDistributionConfigAction(prevState, formData) {
  await requireRole('admin');
  try {
    await saveDistributionConfig({
      taxPercent: formData.get('taxPercent'),
      reinvestPercent: formData.get('reinvestPercent'),
      salaryPercent: formData.get('salaryPercent'),
      reservePercent: formData.get('reservePercent'),
      minMarginPercent: formData.get('minMarginPercent'),
    });
    const commission = Number(formData.get('commissionPercent'));
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      throw new Error('La comisión debe estar entre 0 y 100%.');
    }
    // La comisión es la misma de Ventas → Comisiones (solo para ventas nuevas).
    await setCommissionPercent(commission);
  } catch (error) {
    return { error: error.message };
  }
  revalidateDistribution();
  revalidatePath('/admin/comisiones');
  return { error: null, success: true };
}

/** "Pagué impuestos" / "Usé la reserva": salida de la Caja que vacía ese sobre. */
export async function registerEnvelopeMovementAction(prevState, formData) {
  await requireRole('admin');
  const envelope = String(formData.get('envelope') || '');
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').trim().slice(0, 200);
  const date = String(formData.get('date') || '').trim();
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'El monto no es válido.' };
  if (envelope === 'reserva' && !note) return { error: 'Escribe en qué usaste la reserva.' };
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'La fecha no es válida.' };
  try {
    await createEnvelopeMovement({ envelope, amount, note, occurredAt: date ? `${date}T12:00:00-05:00` : null });
  } catch (error) {
    return { error: error.message };
  }
  revalidateDistribution();
  return { error: null, success: true };
}
