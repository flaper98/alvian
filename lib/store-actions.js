'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { COOKIE_NAME, getSessionUser } from './auth';
import {
  createWebOrder,
  updateWebOrder,
  registerWebOrderAsSales,
  deleteWebOrder,
  getStoreConfig,
  saveStoreConfig,
  createFaq,
  updateFaq,
  deleteFaq,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  createComplaint,
  updateComplaint,
} from './store-db';
import { DEPARTMENTS } from './store-config';

async function requireUser(...allowedRoles) {
  const cookieStore = await cookies();
  const user = getSessionUser(cookieStore.get(COOKIE_NAME)?.value);
  if (!user || !allowedRoles.includes(user.role)) throw new Error('No autorizado.');
  return user;
}

async function safely(work) {
  try {
    await work();
    return { error: null };
  } catch (error) {
    return { error: error.message || 'No se pudo completar la acción.' };
  }
}

const text = (formData, key, max = 200) =>
  String(formData.get(key) || '')
    .trim()
    .slice(0, max);

function isSafeUrl(value) {
  return !value || /^(https:\/\/|\/(?!\/))[^\s"'<>]*$/i.test(value);
}

function revalidateStore() {
  revalidatePath('/', 'layout');
}

// ---------- Checkout público ----------

export async function placeOrderAction(prevState, formData) {
  // Campo trampa para bots: una persona nunca lo ve ni lo llena.
  if (text(formData, 'website')) return { error: 'No se pudo enviar el pedido.' };

  const data = {
    customerName: text(formData, 'name', 120),
    doc: text(formData, 'doc', 20),
    phone: text(formData, 'phone', 20),
    email: text(formData, 'email', 120),
    department: text(formData, 'department', 60),
    province: text(formData, 'province', 80),
    district: text(formData, 'district', 80),
    address: text(formData, 'address', 250),
    reference: text(formData, 'reference', 250),
    notes: text(formData, 'notes', 500),
    operationNumber: text(formData, 'operation', 60),
    voucherUrl: text(formData, 'voucherUrl', 500),
    shippingId: text(formData, 'shipping', 40),
    paymentMethod: text(formData, 'method', 40),
  };

  const errors = [];
  if (data.customerName.length < 3) errors.push('Ingresa tu nombre completo.');
  if (!/^[\d\s+]{9,15}$/.test(data.phone)) errors.push('Ingresa un celular válido (9 dígitos).');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('El correo no es válido.');
  }
  if (!DEPARTMENTS.includes(data.department)) errors.push('Elige tu departamento.');
  if (!data.district || !data.address) errors.push('Completa distrito y dirección de entrega.');
  if (formData.get('terms') !== 'on') {
    errors.push('Debes aceptar los términos y la política de privacidad.');
  }
  if (!isSafeUrl(data.voucherUrl)) errors.push('El comprobante no es válido. Vuelve a subirlo.');

  let items = [];
  try {
    const parsed = JSON.parse(String(formData.get('cart') || '[]'));
    if (Array.isArray(parsed)) items = parsed;
  } catch (error) {
    items = [];
  }
  if (items.length === 0) errors.push('Tu carrito está vacío.');

  if (errors.length) return { error: errors.join(' '), fields: Object.fromEntries(formData) };

  let order;
  try {
    order = await createWebOrder({ ...data, items });
  } catch (error) {
    return { error: error.message, fields: Object.fromEntries(formData) };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/pedidos-web');
  redirect(`/pedido/${order.code}?t=${order.token}&nuevo=1`);
}

// ---------- Libro de reclamaciones (público) ----------

export async function submitComplaintAction(prevState, formData) {
  if (text(formData, 'website')) return { error: 'No se pudo enviar.' };

  const kind = text(formData, 'kind', 20);
  const itemType = text(formData, 'itemType', 20) === 'servicio' ? 'servicio' : 'producto';
  const data = {
    kind,
    itemType,
    name: text(formData, 'name', 120),
    doc: text(formData, 'doc', 20),
    address: text(formData, 'address', 250),
    phone: text(formData, 'phone', 30),
    email: text(formData, 'email', 120),
    guardian: text(formData, 'guardian', 120),
    amount: Number(formData.get('amount')) || null,
    itemDesc: text(formData, 'itemDesc', 500),
    orderCode: text(formData, 'orderCode', 30),
    detail: text(formData, 'detail', 3000),
    request: text(formData, 'request', 2000),
  };

  const errors = [];
  if (!['reclamo', 'queja'].includes(kind)) errors.push('Indica si es reclamo o queja.');
  if (data.name.length < 3 || !data.doc || !data.address) {
    errors.push('Completa nombre, documento y domicilio.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Ingresa un correo válido para enviarte la respuesta.');
  }
  if (data.detail.length < 10) errors.push('Describe el detalle de tu reclamo o queja.');
  if (formData.get('accept') !== 'on') errors.push('Confirma que la información es verdadera.');
  if (errors.length) return { error: errors.join(' '), fields: Object.fromEntries(formData) };

  try {
    const number = await createComplaint(data);
    revalidatePath('/admin/reclamos');
    return { error: null, number, kind };
  } catch (error) {
    return { error: 'No se pudo registrar. Intenta de nuevo.', fields: Object.fromEntries(formData) };
  }
}

// ---------- Pedidos web (admin y vendedora) ----------

export async function updateWebOrderAction(id, prevState, formData) {
  try {
    await requireUser('admin', 'vendedora');
    await updateWebOrder(id, {
      status: text(formData, 'status', 20),
      tracking: text(formData, 'tracking', 500),
      adminNote: text(formData, 'adminNote', 500),
    });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/pedidos-web');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  return { error: null, success: true };
}

export async function registerWebOrderSaleAction(id) {
  const result = await safely(async () => {
    const user = await requireUser('admin', 'vendedora');
    await registerWebOrderAsSales(id, { soldByName: `Tienda web · ${user.name || 'Admin'}` });
  });
  revalidatePath('/admin/pedidos-web');
  revalidatePath('/admin');
  revalidatePath('/admin/ventas');
  revalidatePath('/admin/catalogo');
  revalidateStore();
  return result;
}

export async function deleteWebOrderAction(id) {
  const result = await safely(async () => {
    await requireUser('admin');
    await deleteWebOrder(id);
  });
  revalidatePath('/admin/pedidos-web');
  revalidatePath('/admin');
  return result;
}

// ---------- Ajustes de la tienda (solo admin) ----------

function parseRows(formData, prefix, fields) {
  const count = Number(formData.get(`${prefix}__count`)) || 0;
  const rows = [];
  for (let i = 0; i < Math.min(count, 20); i += 1) {
    const row = {};
    for (const field of fields) row[field] = String(formData.get(`${prefix}_${i}_${field}`) ?? '').trim();
    if (Object.values(row).some((v) => v && v !== 'on')) rows.push(row);
  }
  return rows;
}

export async function saveStoreConfigAction(prevState, formData) {
  try {
    await requireUser('admin');
    const current = await getStoreConfig();

    const shippingRows = parseRows(formData, 'ship', ['id', 'name', 'detail', 'price', 'local']);
    const options = shippingRows
      .filter((r) => r.name)
      .map((r, i) => ({
        id: (r.id || `envio-${i + 1}`).replace(/[^a-z0-9-]/gi, '').toLowerCase() || `envio-${i + 1}`,
        name: r.name.slice(0, 80),
        detail: r.detail.slice(0, 120),
        price: Math.max(0, Number(r.price) || 0),
        local: r.local === 'on',
      }));
    if (options.length === 0) throw new Error('Agrega al menos una opción de envío.');
    const ids = new Set();
    for (const o of options) {
      while (ids.has(o.id)) o.id = `${o.id}-2`;
      ids.add(o.id);
    }

    const banks = parseRows(formData, 'bank', ['bank', 'account', 'cci', 'holder']).map((b) => ({
      bank: b.bank.slice(0, 40),
      account: b.account.slice(0, 40),
      cci: b.cci.slice(0, 40),
      holder: b.holder.slice(0, 80),
    }));

    const yapeQr = text(formData, 'yapeQr', 500);
    if (!isSafeUrl(yapeQr)) throw new Error('La URL del QR debe empezar con https:// o /');

    const config = {
      ...current,
      announce: {
        enabled: formData.get('announceEnabled') === 'on',
        text: text(formData, 'announceText', 160),
      },
      payment: {
        yapeEnabled: formData.get('yapeEnabled') === 'on',
        yapeNumber: text(formData, 'yapeNumber', 20),
        yapeName: text(formData, 'yapeName', 80),
        yapeQr,
        transferEnabled: formData.get('transferEnabled') === 'on',
        banks,
        cashOnDeliveryEnabled: formData.get('cashOnDeliveryEnabled') === 'on',
        voucherRequired: formData.get('voucherRequired') === 'on',
        instructions: text(formData, 'instructions', 400),
        thanks: text(formData, 'thanks', 400),
      },
      shipping: {
        options,
        freeFrom: Math.max(0, Number(formData.get('freeFrom')) || 0),
      },
      business: {
        razonSocial: text(formData, 'razonSocial', 120),
        ruc: text(formData, 'ruc', 11).replace(/\D/g, ''),
        address: text(formData, 'businessAddress', 160),
        email: text(formData, 'businessEmail', 120),
        hours: text(formData, 'hours', 120),
      },
    };
    const p = config.payment;
    if (!p.yapeEnabled && !p.transferEnabled && !p.cashOnDeliveryEnabled) {
      throw new Error('Activa al menos un método de pago.');
    }
    await saveStoreConfig(config);
  } catch (error) {
    return { error: error.message };
  }
  revalidateStore();
  return { error: null, success: true };
}

// ---------- FAQs y opiniones (solo admin) ----------

export async function createFaqAction(prevState, formData) {
  try {
    await requireUser('admin');
    const question = text(formData, 'question', 200);
    const answer = text(formData, 'answer', 1500);
    if (!question || !answer) throw new Error('Completa la pregunta y la respuesta.');
    await createFaq({ question, answer });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/tienda');
  revalidateStore();
  return { error: null, success: true };
}

export async function updateFaqAction(id, prevState, formData) {
  try {
    await requireUser('admin');
    const question = text(formData, 'question', 200);
    const answer = text(formData, 'answer', 1500);
    if (!question || !answer) throw new Error('Completa la pregunta y la respuesta.');
    await updateFaq(id, { question, answer, active: formData.get('active') === 'on' });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/tienda');
  revalidateStore();
  return { error: null, success: true };
}

export async function deleteFaqAction(id) {
  const result = await safely(async () => {
    await requireUser('admin');
    await deleteFaq(id);
  });
  revalidatePath('/admin/tienda');
  revalidateStore();
  return result;
}

function parseTestimonial(formData) {
  const name = text(formData, 'name', 80);
  const reviewText = text(formData, 'text', 600);
  const rating = Math.max(1, Math.min(5, Math.round(Number(formData.get('rating')) || 5)));
  if (!name || !reviewText) throw new Error('Completa el nombre y la opinión.');
  return { name, city: text(formData, 'city', 60), text: reviewText, rating };
}

export async function createTestimonialAction(prevState, formData) {
  try {
    await requireUser('admin');
    await createTestimonial(parseTestimonial(formData));
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/tienda');
  revalidateStore();
  return { error: null, success: true };
}

export async function updateTestimonialAction(id, prevState, formData) {
  try {
    await requireUser('admin');
    await updateTestimonial(id, {
      ...parseTestimonial(formData),
      active: formData.get('active') === 'on',
    });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/tienda');
  revalidateStore();
  return { error: null, success: true };
}

export async function deleteTestimonialAction(id) {
  const result = await safely(async () => {
    await requireUser('admin');
    await deleteTestimonial(id);
  });
  revalidatePath('/admin/tienda');
  revalidateStore();
  return result;
}

// ---------- Reclamos (solo admin) ----------

export async function updateComplaintAction(id, prevState, formData) {
  try {
    await requireUser('admin');
    const status = text(formData, 'status', 20) === 'respondido' ? 'respondido' : 'nuevo';
    await updateComplaint(id, { status, response: text(formData, 'response', 3000) });
  } catch (error) {
    return { error: error.message };
  }
  revalidatePath('/admin/reclamos');
  return { error: null, success: true };
}
