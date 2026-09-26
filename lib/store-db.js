import crypto from 'crypto';
import { getPool, ensureSchema } from './db';
import {
  DEFAULT_STORE_CONFIG,
  mergeStoreConfig,
  availablePaymentMethods,
  shippingCostFor,
  ORDER_STATUSES,
} from './store-config';

const STORE_CONFIG_KEY = 'store_config';

// ---------- Configuración de la tienda ----------

export async function getStoreConfig() {
  try {
    await ensureSchema();
    const { rows } = await getPool().query('SELECT value FROM settings WHERE key = $1', [
      STORE_CONFIG_KEY,
    ]);
    if (!rows[0]) return mergeStoreConfig(DEFAULT_STORE_CONFIG);
    return mergeStoreConfig(JSON.parse(rows[0].value));
  } catch (error) {
    // Sin base de datos (p. ej. durante el build) se usan los valores por defecto.
    return mergeStoreConfig(DEFAULT_STORE_CONFIG);
  }
}

export async function saveStoreConfig(config) {
  await ensureSchema();
  const merged = mergeStoreConfig(config);
  await getPool().query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [STORE_CONFIG_KEY, JSON.stringify(merged)],
  );
  return merged;
}

// ---------- Preguntas frecuentes ----------

const DEFAULT_FAQS = [
  {
    question: '¿Los perfumes son originales?',
    answer:
      'Sí. Todos nuestros perfumes son 100% originales, sellados y traídos de distribuidores autorizados de marcas árabes como Lattafa, Armaf, Rasasi y Afnan.',
  },
  {
    question: '¿Cuánto demora la entrega?',
    answer:
      'En Pucallpa entregamos el mismo día o al día siguiente, gratis. A provincias enviamos por Shalom u Olva y llega en 2 a 5 días hábiles.',
  },
  {
    question: '¿Cómo pago?',
    answer:
      'Puedes pagar con Yape o Plin al finalizar tu compra. En Pucallpa también aceptamos pago contra entrega.',
  },
  {
    question: '¿Cuánto dura el aroma?',
    answer:
      'Los perfumes árabes son conocidos por su gran duración: la mayoría dura entre 8 y 12 horas en piel, y más en ropa. Escríbenos y te recomendamos según lo que buscas.',
  },
];

export async function listFaqs({ onlyActive = false } = {}) {
  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT id, question, answer, sort, active FROM faqs
       ${onlyActive ? 'WHERE active = true' : ''} ORDER BY sort, id`,
    );
    return rows;
  } catch (error) {
    return [];
  }
}

/** FAQs para la tienda: si todavía no cargaste ninguna, muestra las de ejemplo. */
export async function listPublicFaqs() {
  let total = 0;
  try {
    await ensureSchema();
    const { rows } = await getPool().query('SELECT count(*)::int AS n FROM faqs');
    total = rows[0].n;
  } catch (error) {
    return DEFAULT_FAQS.map((f, i) => ({ id: `d${i}`, ...f }));
  }
  if (total === 0) return DEFAULT_FAQS.map((f, i) => ({ id: `d${i}`, ...f }));
  return listFaqs({ onlyActive: true });
}

export async function createFaq({ question, answer }) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO faqs (question, answer, sort)
     VALUES ($1, $2, COALESCE((SELECT max(sort) + 1 FROM faqs), 0))`,
    [question, answer],
  );
}

export async function updateFaq(id, { question, answer, active }) {
  await ensureSchema();
  await getPool().query('UPDATE faqs SET question = $1, answer = $2, active = $3 WHERE id = $4', [
    question,
    answer,
    active,
    id,
  ]);
}

export async function deleteFaq(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM faqs WHERE id = $1', [id]);
}

// ---------- Opiniones de clientes ----------

export async function listTestimonials({ onlyActive = false } = {}) {
  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT id, name, city, text, rating, sort, active FROM testimonials
       ${onlyActive ? 'WHERE active = true' : ''} ORDER BY sort, id`,
    );
    return rows;
  } catch (error) {
    return [];
  }
}

export async function createTestimonial({ name, city, text, rating }) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO testimonials (name, city, text, rating, sort)
     VALUES ($1, $2, $3, $4, COALESCE((SELECT max(sort) + 1 FROM testimonials), 0))`,
    [name, city || null, text, rating],
  );
}

export async function updateTestimonial(id, { name, city, text, rating, active }) {
  await ensureSchema();
  await getPool().query(
    'UPDATE testimonials SET name = $1, city = $2, text = $3, rating = $4, active = $5 WHERE id = $6',
    [name, city || null, text, rating, active, id],
  );
}

export async function deleteTestimonial(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM testimonials WHERE id = $1', [id]);
}

// ---------- Pedidos web ----------

const ORDER_COLUMNS = `id, code, token, status, customer_name, doc, phone, email, department, province,
  district, address, reference, shipping_name, shipping_cost, subtotal, total, payment_method,
  operation_number, voucher_url, customer_notes, tracking, admin_note, sale_ids, created_at, updated_at`;

async function attachItems(orders) {
  if (orders.length === 0) return orders;
  const { rows } = await getPool().query(
    `SELECT i.id, i.order_id, i.perfume_id, i.name, i.quantity, i.unit_price, i.line_total,
            p.image_url
     FROM web_order_items i LEFT JOIN perfumes p ON p.id = i.perfume_id
     WHERE i.order_id = ANY($1::int[]) ORDER BY i.id`,
    [orders.map((o) => o.id)],
  );
  const byOrder = new Map(orders.map((o) => [o.id, []]));
  for (const row of rows) byOrder.get(row.order_id)?.push(row);
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }));
}

/**
 * Crea un pedido desde el checkout. Todo se recalcula en el servidor: precios,
 * stock, costo de envío y métodos de pago permitidos (nunca se confía en lo
 * que manda el navegador).
 */
export async function createWebOrder(input) {
  await ensureSchema();
  const config = await getStoreConfig();

  const option = config.shipping.options.find((o) => o.id === input.shippingId);
  if (!option) throw new Error('Elige un método de envío.');
  const methods = availablePaymentMethods(config, option);
  if (!methods.includes(input.paymentMethod)) throw new Error('Elige un método de pago válido.');
  if (
    config.payment.voucherRequired &&
    input.paymentMethod !== 'contraentrega' &&
    !input.voucherUrl
  ) {
    throw new Error('Sube la captura de tu comprobante de pago.');
  }

  // Agrupa por perfume (el mismo perfume podría venir dos veces).
  const qtyById = new Map();
  for (const item of input.items.slice(0, 30)) {
    const id = Number(item.id);
    const qty = Math.max(0, Math.min(20, Math.floor(Number(item.qty) || 0)));
    if (!id || !qty) continue;
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }
  if (qtyById.size === 0) throw new Error('Tu carrito está vacío.');

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: perfumes } = await client.query(
      'SELECT id, name, price, stock FROM perfumes WHERE id = ANY($1::int[])',
      [[...qtyById.keys()]],
    );
    const lines = [];
    const problems = [];
    for (const [id, qty] of qtyById) {
      const perfume = perfumes.find((p) => p.id === id);
      if (!perfume || Number(perfume.price) <= 0) {
        problems.push('Uno de los perfumes de tu carrito ya no está disponible.');
        continue;
      }
      if (Number(perfume.stock) < qty) {
        problems.push(
          Number(perfume.stock) <= 0
            ? `${perfume.name} está agotado.`
            : `Solo quedan ${perfume.stock} unidades de ${perfume.name}.`,
        );
        continue;
      }
      const unitPrice = Number(perfume.price);
      lines.push({
        perfumeId: id,
        name: perfume.name,
        quantity: qty,
        unitPrice,
        lineTotal: Math.round(unitPrice * qty * 100) / 100,
      });
    }
    if (problems.length) throw new Error(problems.join(' '));

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const shippingCost = shippingCostFor(config, option, subtotal);
    const total = Math.round((subtotal + shippingCost) * 100) / 100;
    const token = crypto.randomBytes(16).toString('hex');

    const { rows: seq } = await client.query("SELECT nextval('web_order_code_seq') AS n");
    const code = `ALV-${String(seq[0].n).padStart(5, '0')}`;

    const { rows } = await client.query(
      `INSERT INTO web_orders (code, token, customer_name, doc, phone, email, department, province,
         district, address, reference, shipping_name, shipping_cost, subtotal, total, payment_method,
         operation_number, voucher_url, customer_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING ${ORDER_COLUMNS}`,
      [
        code,
        token,
        input.customerName,
        input.doc || null,
        input.phone,
        input.email || null,
        input.department || null,
        input.province || null,
        input.district || null,
        input.address || null,
        input.reference || null,
        option.name,
        shippingCost,
        subtotal,
        total,
        input.paymentMethod,
        input.operationNumber || null,
        input.voucherUrl || null,
        input.notes || null,
      ],
    );
    const order = rows[0];
    for (const l of lines) {
      await client.query(
        `INSERT INTO web_order_items (order_id, perfume_id, name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, l.perfumeId, l.name, l.quantity, l.unitPrice, l.lineTotal],
      );
    }
    await client.query('COMMIT');
    return { ...order, items: lines };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getWebOrderByToken(code, token) {
  await ensureSchema();
  if (!code || !token) return null;
  const { rows } = await getPool().query(
    `SELECT ${ORDER_COLUMNS} FROM web_orders WHERE code = $1`,
    [code],
  );
  const order = rows[0];
  if (!order) return null;
  const a = Buffer.from(String(order.token));
  const b = Buffer.from(String(token));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return (await attachItems([order]))[0];
}

/** Seguimiento público: código + últimos 9 dígitos del celular. */
export async function findWebOrderForTracking(code, phone) {
  await ensureSchema();
  const digits = String(phone || '').replace(/\D/g, '');
  if (!code || digits.length < 6) return null;
  const { rows } = await getPool().query(
    `SELECT ${ORDER_COLUMNS} FROM web_orders WHERE code = $1`,
    [String(code).trim().toUpperCase()],
  );
  const order = rows[0];
  if (!order) return null;
  const saved = String(order.phone).replace(/\D/g, '');
  if (saved.slice(-9) !== digits.slice(-9)) return null;
  return (await attachItems([order]))[0];
}

export async function listWebOrders({ status } = {}) {
  await ensureSchema();
  const params = [];
  let where = '';
  if (status && ORDER_STATUSES[status]) {
    params.push(status);
    where = 'WHERE status = $1';
  }
  const { rows } = await getPool().query(
    `SELECT ${ORDER_COLUMNS} FROM web_orders ${where} ORDER BY created_at DESC LIMIT 300`,
    params,
  );
  return attachItems(rows);
}

export async function countWebOrdersByStatus() {
  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      'SELECT status, count(*)::int AS n FROM web_orders GROUP BY status',
    );
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  } catch (error) {
    return {};
  }
}

// Estados en los que el pedido ya se considera pagado y debe contar como venta.
// Contra entrega solo se cobra al entregar.
const PAID_STATUSES = ['pagado', 'preparando', 'enviado', 'entregado'];

/** ¿Pasar este pedido a `nextStatus` debe registrarlo como venta automáticamente? */
export async function shouldAutoRegisterWebOrder(id, nextStatus) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT sale_ids, payment_method FROM web_orders WHERE id = $1',
    [id],
  );
  const order = rows[0];
  if (!order || order.sale_ids?.length) return false;
  if (!PAID_STATUSES.includes(nextStatus)) return false;
  return order.payment_method !== 'contraentrega' || nextStatus === 'entregado';
}

export async function updateWebOrder(id, { status, tracking, adminNote }) {
  await ensureSchema();
  if (!ORDER_STATUSES[status]) throw new Error('Estado no válido.');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE web_orders SET status = $1, tracking = $2, admin_note = $3, updated_at = now()
       WHERE id = $4 RETURNING ${ORDER_COLUMNS}`,
      [status, tracking || null, adminNote || null, id],
    );
    const order = rows[0];
    if (!order) throw new Error('El pedido no existe.');
    // Si el pedido ya se registró como venta, la marca de "entregado" se sincroniza.
    if (order.sale_ids?.length) {
      await client.query('UPDATE sales SET delivered = $1 WHERE id = ANY($2::int[])', [
        status === 'entregado',
        order.sale_ids,
      ]);
    }
    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Convierte un pedido web en ventas (una por perfume): descuenta stock y entra
 * al Resumen, igual que una venta registrada a mano. Solo se puede hacer una vez.
 */
export async function registerWebOrderAsSales(id, { soldByName } = {}) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`SELECT ${ORDER_COLUMNS} FROM web_orders WHERE id = $1 FOR UPDATE`, [id]);
    const order = rows[0];
    if (!order) throw new Error('El pedido no existe.');
    if (order.sale_ids?.length) throw new Error('Este pedido ya se registró como venta.');
    if (order.status === 'cancelado') throw new Error('No se puede registrar un pedido cancelado.');

    const { rows: items } = await client.query(
      'SELECT perfume_id, name, quantity, unit_price FROM web_order_items WHERE order_id = $1',
      [id],
    );
    const saleIds = [];
    for (const item of items) {
      if (!item.perfume_id) throw new Error(`El perfume "${item.name}" ya no existe en el catálogo.`);
      const { rows: stockRows } = await client.query(
        'SELECT stock FROM perfumes WHERE id = $1 FOR UPDATE',
        [item.perfume_id],
      );
      if (!stockRows[0] || stockRows[0].stock < item.quantity) {
        throw new Error(
          `No hay stock suficiente de ${item.name} (disponible: ${stockRows[0]?.stock ?? 0}).`,
        );
      }
      const { rows: saleRows } = await client.query(
        `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role, sold_by_name, delivered, commission_amount)
         VALUES ($1, $2, $3, 'contado', $4, 'admin', $5, $6, NULL) RETURNING id`,
        [
          item.perfume_id,
          item.quantity,
          item.unit_price,
          `${order.customer_name} (web ${order.code})`,
          soldByName || 'Tienda web',
          order.status === 'entregado',
        ],
      );
      saleIds.push(saleRows[0].id);
      await client.query('UPDATE perfumes SET stock = stock - $1 WHERE id = $2', [
        item.quantity,
        item.perfume_id,
      ]);
    }
    const nextStatus = order.status === 'pendiente' ? 'pagado' : order.status;
    await client.query(
      'UPDATE web_orders SET sale_ids = $1, status = $2, updated_at = now() WHERE id = $3',
      [saleIds, nextStatus, id],
    );
    await client.query('COMMIT');
    return saleIds;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteWebOrder(id) {
  await ensureSchema();
  const { rows } = await getPool().query('SELECT sale_ids FROM web_orders WHERE id = $1', [id]);
  if (rows[0]?.sale_ids?.length) {
    throw new Error(
      'Este pedido ya se registró como venta. Márcalo como cancelado o elimina primero las ventas.',
    );
  }
  await getPool().query('DELETE FROM web_orders WHERE id = $1', [id]);
}

// ---------- Libro de reclamaciones ----------

export async function createComplaint(data) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO complaints (kind, name, doc, address, phone, email, guardian, item_type, amount,
       item_desc, order_code, detail, request)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, created_at`,
    [
      data.kind,
      data.name,
      data.doc,
      data.address,
      data.phone || null,
      data.email,
      data.guardian || null,
      data.itemType,
      data.amount || null,
      data.itemDesc || null,
      data.orderCode || null,
      data.detail,
      data.request || null,
    ],
  );
  const { id, created_at: createdAt } = rows[0];
  const number = `${String(id).padStart(6, '0')}-${new Date(createdAt).getFullYear()}`;
  await getPool().query('UPDATE complaints SET number = $1 WHERE id = $2', [number, id]);
  return number;
}

export async function listComplaints() {
  await ensureSchema();
  const { rows } = await getPool().query('SELECT * FROM complaints ORDER BY created_at DESC');
  return rows;
}

export async function updateComplaint(id, { status, response }) {
  await ensureSchema();
  await getPool().query('UPDATE complaints SET status = $1, response = $2 WHERE id = $3', [
    status,
    response || null,
    id,
  ]);
}
