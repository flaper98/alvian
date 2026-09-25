import { Pool } from 'pg';
import { PANDERO_CUOTA_AMOUNT, PANDERO_AUTO_PAYMENT_NOTE } from './pandero';

let pool;
let schemaReady;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Falta configurar DATABASE_URL en las variables de entorno.');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(`
      CREATE TABLE IF NOT EXISTS perfumes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS video_url TEXT;
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS category TEXT;

      CREATE TABLE IF NOT EXISTS hero_banners (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        alt_text TEXT NOT NULL,
        link_url TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        quantity INTEGER NOT NULL,
        unit_cost NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS freight_cost NUMERIC(10,2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        payment_type TEXT NOT NULL,
        customer_name TEXT,
        sold_by_role TEXT NOT NULL,
        commission_amount NUMERIC(10,2),
        commission_paid BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivered BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by_name TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS commission_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS credit_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        customer_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        note TEXT,
        fulfilled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS stocked BOOLEAN NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pandero_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        interval_days INTEGER NOT NULL DEFAULT 7,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE pandero_groups ADD COLUMN IF NOT EXISTS cuotas_total NUMERIC(10,2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS pandero_entries (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES pandero_groups(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        fulfilled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE pandero_entries ADD COLUMN IF NOT EXISTS paying BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE pandero_entries ADD COLUMN IF NOT EXISTS round_recorded BOOLEAN NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS pandero_round_payments (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES pandero_groups(id) ON DELETE CASCADE,
        round_entry_id INTEGER REFERENCES pandero_entries(id) ON DELETE SET NULL,
        payer_entry_id INTEGER REFERENCES pandero_entries(id) ON DELETE SET NULL,
        payer_name TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id SERIAL PRIMARY KEY,
        kind TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS commission_payouts (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS supplier_prices (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
        perfume_id INTEGER REFERENCES perfumes(id) ON DELETE CASCADE,
        tier_label TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (supplier_id, perfume_id, tier_label)
      );
      ALTER TABLE supplier_prices ALTER COLUMN perfume_id DROP NOT NULL;
      ALTER TABLE supplier_prices ADD COLUMN IF NOT EXISTS product_name TEXT;

      -- ---------- Tienda online (carrito + checkout) ----------
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS compare_price NUMERIC(10,2);
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS notes TEXT;

      CREATE SEQUENCE IF NOT EXISTS web_order_code_seq START 1001;
      CREATE TABLE IF NOT EXISTS web_orders (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        token TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente',
        customer_name TEXT NOT NULL,
        doc TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        department TEXT,
        province TEXT,
        district TEXT,
        address TEXT,
        reference TEXT,
        shipping_name TEXT,
        shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
        subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
        total NUMERIC(10,2) NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL,
        operation_number TEXT,
        voucher_url TEXT,
        customer_notes TEXT,
        tracking TEXT,
        admin_note TEXT,
        sale_ids INTEGER[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS web_orders_status_idx ON web_orders (status);

      CREATE TABLE IF NOT EXISTS web_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES web_orders(id) ON DELETE CASCADE,
        perfume_id INTEGER REFERENCES perfumes(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        line_total NUMERIC(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS testimonials (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        text TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        sort INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        number TEXT,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        doc TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        email TEXT NOT NULL,
        guardian TEXT,
        item_type TEXT NOT NULL DEFAULT 'producto',
        amount NUMERIC(10,2),
        item_desc TEXT,
        order_code TEXT,
        detail TEXT NOT NULL,
        request TEXT,
        status TEXT NOT NULL DEFAULT 'nuevo',
        response TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `).catch((error) => {
      // Si falla (p. ej. la base no estaba lista), se reintenta en la próxima
      // llamada en vez de dejar la promesa rechazada cacheada para siempre.
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

// ---------- Perfumes ----------

export async function listPerfumes() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, name, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at FROM perfumes ORDER BY created_at DESC',
  );
  return rows;
}

export async function createPerfume({ name, price, imageUrl, videoUrl, description, category, comparePrice, featured, notes }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO perfumes (name, price, image_url, video_url, description, category, compare_price, featured, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at`,
    [
      name,
      price,
      imageUrl,
      videoUrl || null,
      description || null,
      category || null,
      comparePrice || null,
      Boolean(featured),
      notes || null,
    ],
  );
  return rows[0];
}

export async function updatePerfume(
  id,
  { name, price, imageUrl, videoUrl, description, category, stock, comparePrice, featured, notes },
) {
  await ensureSchema();
  // stock es opcional: solo se pasa desde "Editar perfume" para corregir el
  // stock a mano; si no viene, se deja como está.
  const { rows } = await getPool().query(
    `UPDATE perfumes
     SET name = $1, price = $2, image_url = $3, video_url = $4, description = $5, category = $6,
         stock = COALESCE($8, stock), compare_price = $9, featured = $10, notes = $11
     WHERE id = $7
     RETURNING id, name, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at`,
    [
      name,
      price,
      imageUrl,
      videoUrl || null,
      description || null,
      category || null,
      id,
      stock ?? null,
      comparePrice || null,
      Boolean(featured),
      notes || null,
    ],
  );
  return rows[0];
}

export async function deletePerfume(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM perfumes WHERE id = $1', [id]);
}

// ---------- Banners del carrusel de inicio ----------

export async function listHeroBanners({ onlyActive = false } = {}) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, image_url, alt_text, link_url, position, active, created_at
     FROM hero_banners
     ${onlyActive ? 'WHERE active = true' : ''}
     ORDER BY position ASC, created_at ASC`,
  );
  return rows;
}

export async function createHeroBanner({ imageUrl, altText, linkUrl }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO hero_banners (image_url, alt_text, link_url, position)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(position) FROM hero_banners), -1) + 1)
     RETURNING id, image_url, alt_text, link_url, position, active, created_at`,
    [imageUrl, altText, linkUrl || null],
  );
  return rows[0];
}

export async function updateHeroBanner(id, { imageUrl, altText, linkUrl }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE hero_banners SET image_url = $1, alt_text = $2, link_url = $3
     WHERE id = $4
     RETURNING id, image_url, alt_text, link_url, position, active, created_at`,
    [imageUrl, altText, linkUrl || null, id],
  );
  return rows[0];
}

export async function setHeroBannerActive(id, active) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE hero_banners SET active = $1 WHERE id = $2 RETURNING id, active',
    [active, id],
  );
  return rows[0];
}

export async function deleteHeroBanner(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM hero_banners WHERE id = $1', [id]);
}

/** Intercambia la posición de un banner con la del vecino inmediato (arriba
 * o abajo en la lista), para reordenar sin necesidad de arrastrar y soltar. */
export async function moveHeroBanner(id, direction) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id, position FROM hero_banners ORDER BY position ASC, created_at ASC',
    );
    const index = rows.findIndex((row) => row.id === id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) {
      await client.query('ROLLBACK');
      return;
    }
    const current = rows[index];
    const swapWith = rows[swapIndex];
    await client.query('UPDATE hero_banners SET position = $1 WHERE id = $2', [
      swapWith.position,
      current.id,
    ]);
    await client.query('UPDATE hero_banners SET position = $1 WHERE id = $2', [
      current.position,
      swapWith.id,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Pega varias líneas "Nombre: descripción" (una por perfume) y actualiza el
 * campo "Detalle" de cada uno que coincida exactamente (sin distinguir
 * mayúsculas/espacios) con un perfume ya existente en el catálogo. No crea
 * perfumes nuevos ni toca nada más que la descripción. */
export async function bulkUpdatePerfumeDescriptions(rawText) {
  await ensureSchema();
  const perfumes = await listPerfumes();

  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const updated = [];
  const unmatched = [];

  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      unmatched.push({ line, reason: 'Falta ":" para separar el nombre de la descripción.' });
      continue;
    }
    const namePart = line.slice(0, separatorIndex).trim();
    const descriptionPart = line.slice(separatorIndex + 1).trim();
    if (!namePart || !descriptionPart) {
      unmatched.push({ line, reason: 'Falta el nombre o la descripción.' });
      continue;
    }

    const match = perfumes.find((p) => p.name.trim().toLowerCase() === namePart.toLowerCase());
    if (!match) {
      unmatched.push({ line, reason: `"${namePart}" no coincide con ningún perfume de tu catálogo.` });
      continue;
    }

    await getPool().query('UPDATE perfumes SET description = $1 WHERE id = $2', [
      descriptionPart,
      match.id,
    ]);
    updated.push({ line, perfumeName: match.name });
  }

  return { updated, unmatched };
}

// ---------- Compras ----------

export async function createPurchase({ perfumeId, quantity, unitCost, freightCost, marginPerUnit, note }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO purchases (perfume_id, quantity, unit_cost, freight_cost, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, perfume_id, quantity, unit_cost, freight_cost, note, created_at`,
      [perfumeId, quantity, unitCost, freightCost || 0, note || null],
    );
    await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [quantity, perfumeId]);

    let newPrice = null;
    if (marginPerUnit !== null && marginPerUnit !== undefined) {
      const landedUnitCost = (quantity * unitCost + (freightCost || 0)) / quantity;
      newPrice = Number((landedUnitCost + marginPerUnit).toFixed(2));
      await client.query('UPDATE perfumes SET price = $1 WHERE id = $2', [newPrice, perfumeId]);
    }

    await client.query('COMMIT');
    return { ...rows[0], newPrice };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePurchase(id, { quantity, unitCost, freightCost, marginPerUnit, note }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query(
      'SELECT perfume_id, quantity FROM purchases WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (existingRows.length === 0) {
      throw new Error('La compra no existe.');
    }
    const existing = existingRows[0];
    const perfumeId = existing.perfume_id;

    if (Number(existing.quantity) !== quantity) {
      const { rows: perfumeRows } = await client.query(
        'SELECT stock FROM perfumes WHERE id = $1 FOR UPDATE',
        [perfumeId],
      );
      const withoutThisPurchase = perfumeRows[0].stock - Number(existing.quantity);
      if (withoutThisPurchase + quantity < 0) {
        throw new Error(
          'No se puede reducir la cantidad: ya se vendieron unidades de este lote de compra.',
        );
      }
      await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [
        quantity - Number(existing.quantity),
        perfumeId,
      ]);
    }

    const { rows } = await client.query(
      `UPDATE purchases SET quantity = $1, unit_cost = $2, freight_cost = $3, note = $4
       WHERE id = $5
       RETURNING id, perfume_id, quantity, unit_cost, freight_cost, note, created_at`,
      [quantity, unitCost, freightCost || 0, note || null, id],
    );

    let newPrice = null;
    if (marginPerUnit !== null && marginPerUnit !== undefined) {
      const landedUnitCost = (quantity * unitCost + (freightCost || 0)) / quantity;
      newPrice = Number((landedUnitCost + marginPerUnit).toFixed(2));
      await client.query('UPDATE perfumes SET price = $1 WHERE id = $2', [newPrice, perfumeId]);
    }

    await client.query('COMMIT');
    return { ...rows[0], newPrice };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePurchase(id) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: purchaseRows } = await client.query(
      'SELECT perfume_id, quantity FROM purchases WHERE id = $1',
      [id],
    );
    if (purchaseRows.length === 0) {
      throw new Error('La compra no existe.');
    }
    const { perfume_id: perfumeId, quantity } = purchaseRows[0];

    const { rows: perfumeRows } = await client.query(
      'SELECT stock FROM perfumes WHERE id = $1 FOR UPDATE',
      [perfumeId],
    );
    if (perfumeRows[0].stock - quantity < 0) {
      throw new Error('No se puede eliminar: ya se vendieron unidades de este lote de compra.');
    }

    await client.query('DELETE FROM purchases WHERE id = $1', [id]);
    await client.query('UPDATE perfumes SET stock = stock - $1 WHERE id = $2', [quantity, perfumeId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listPurchases() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT p.id, p.perfume_id, p.quantity, p.unit_cost, p.freight_cost, p.note, p.created_at,
           f.name AS perfume_name,
           (p.quantity * p.unit_cost) + p.freight_cost AS total_cost,
           ((p.quantity * p.unit_cost) + p.freight_cost) / p.quantity AS landed_unit_cost
    FROM purchases p
    JOIN perfumes f ON f.id = p.perfume_id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

// ---------- Gastos extras ----------

export async function createExpense({ description, amount, note }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO expenses (description, amount, note)
     VALUES ($1, $2, $3)
     RETURNING id, description, amount, note, created_at`,
    [description, amount, note || null],
  );
  return rows[0];
}

export async function listExpenses() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, description, amount, note, created_at FROM expenses ORDER BY created_at DESC',
  );
  return rows;
}

export async function updateExpense(id, { description, amount, note }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE expenses SET description = $1, amount = $2, note = $3
     WHERE id = $4
     RETURNING id, description, amount, note, created_at`,
    [description, amount, note || null, id],
  );
  return rows[0];
}

export async function deleteExpense(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM expenses WHERE id = $1', [id]);
}

// ---------- Caja: aportes de capital y retiros ----------

export const CASH_KINDS = ['aporte', 'retiro'];

export async function createCashMovement({ kind, amount, note, occurredAt }) {
  await ensureSchema();
  if (!CASH_KINDS.includes(kind)) throw new Error('Tipo de movimiento no válido.');
  const { rows } = await getPool().query(
    `INSERT INTO cash_movements (kind, amount, note, occurred_at)
     VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()))
     RETURNING id, kind, amount, note, occurred_at, created_at`,
    [kind, amount, note || null, occurredAt || null],
  );
  return rows[0];
}

export async function listCashMovements() {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, kind, amount, note, occurred_at, created_at
     FROM cash_movements ORDER BY occurred_at DESC, id DESC`,
  );
  return rows;
}

export async function deleteCashMovement(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM cash_movements WHERE id = $1', [id]);
}

// ---------- Períodos (hora de Lima, UTC-5 sin horario de verano) ----------

export const PERIODS = {
  mes: 'Este mes',
  'mes-pasado': 'Mes pasado',
  todo: 'Todo',
};

function limaMonthStart(year, month) {
  return new Date(Date.UTC(year, month, 1, 5));
}

export function periodRange(period) {
  if (period === 'todo' || !PERIODS[period]) return { start: null, end: null };
  const limaNow = new Date(Date.now() - 5 * 3600 * 1000);
  const year = limaNow.getUTCFullYear();
  const month = limaNow.getUTCMonth();
  if (period === 'mes-pasado') {
    return { start: limaMonthStart(year, month - 1), end: limaMonthStart(year, month) };
  }
  return { start: limaMonthStart(year, month), end: limaMonthStart(year, month + 1) };
}

// Filtro de fecha reutilizable: $1 = inicio (o null), $2 = fin (o null).
function inRange(column) {
  return `($1::timestamptz IS NULL OR ${column} >= $1) AND ($2::timestamptz IS NULL OR ${column} < $2)`;
}

/**
 * Dinero que entró y salió del negocio en un rango de fechas. Cada sol se
 * cuenta una sola vez:
 * - Pandero: entra como S/ (participantes × cuota) cuando se completa el
 *   número y se entrega el perfume (el cobro automático de esa venta). Las
 *   cuotas que se van juntando en la semana no se suman aquí; se ven aparte
 *   en getPanderoInProgress().
 * - Abonos de crédito: todos los abonos reales, sin ese cobro automático.
 */
export async function getCashFlow({ start = null, end = null } = {}) {
  await ensureSchema();
  const pool = getPool();
  const range = [start, end];
  const allTime = !start && !end;

  const [contado, creditPayments, pandero, purchases, expenses, commissions, movements] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales
         WHERE payment_type = 'contado' AND ${inRange('created_at')}`,
        range,
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM credit_payments
         WHERE note IS DISTINCT FROM $3 AND ${inRange('paid_at')}`,
        [...range, PANDERO_AUTO_PAYMENT_NOTE],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total FROM credit_payments
         WHERE note = $3 AND ${inRange('paid_at')}`,
        [...range, PANDERO_AUTO_PAYMENT_NOTE],
      ),
      pool.query(
        `SELECT COALESCE(SUM(quantity * unit_cost + freight_cost), 0) AS total FROM purchases
         WHERE ${inRange('created_at')}`,
        range,
      ),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE ${inRange('created_at')}`, range),
      // En "Todo" se usa lo pagado según cada venta (incluye pagos anteriores a
      // que se guardara la fecha); por período, solo los pagos con fecha.
      allTime
        ? pool.query('SELECT COALESCE(SUM(commission_paid_amount), 0) AS total FROM sales')
        : pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total FROM commission_payouts WHERE ${inRange('created_at')}`,
            range,
          ),
      pool.query(
        `SELECT kind, COALESCE(SUM(amount), 0) AS total FROM cash_movements
         WHERE ${inRange('occurred_at')} GROUP BY kind`,
        range,
      ),
    ]);

  const contadoTotal = Number(contado.rows[0].total);
  const creditTotal = Number(creditPayments.rows[0].total);
  const panderoTotal = Number(pandero.rows[0].total);
  const capitalIn = Number(movements.rows.find((r) => r.kind === 'aporte')?.total || 0);
  const withdrawals = Number(movements.rows.find((r) => r.kind === 'retiro')?.total || 0);
  const purchasesTotal = Number(purchases.rows[0].total);
  const expensesTotal = Number(expenses.rows[0].total);
  const commissionsPaid = Number(commissions.rows[0].total);

  const incomeTotal = contadoTotal + creditTotal + panderoTotal;
  const outTotal = purchasesTotal + expensesTotal + commissionsPaid + withdrawals;

  return {
    contado: contadoTotal,
    contadoCount: contado.rows[0].count,
    creditPayments: creditTotal,
    pandero: panderoTotal,
    panderoCount: pandero.rows[0].count,
    incomeTotal,
    capitalIn,
    purchases: purchasesTotal,
    expenses: expensesTotal,
    commissionsPaid,
    withdrawals,
    outTotal,
    net: capitalIn + incomeTotal - outTotal,
  };
}

/** Número del pandero que se está juntando esta semana, por grupo activo. */
export async function getPanderoInProgress() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT g.id, g.name,
           COUNT(e.id)::int AS size,
           COUNT(e.id) FILTER (WHERE e.paying)::int AS paying,
           nxt.position AS next_position,
           nxt.customer_name AS next_customer
    FROM pandero_groups g
    JOIN pandero_entries e ON e.group_id = g.id
    JOIN LATERAL (
      SELECT position, customer_name FROM pandero_entries
      WHERE group_id = g.id AND fulfilled = false
      ORDER BY position LIMIT 1
    ) nxt ON true
    GROUP BY g.id, g.name, nxt.position, nxt.customer_name
    ORDER BY g.id
  `);
  return rows.map((row) => ({
    ...row,
    collected: row.paying * PANDERO_CUOTA_AMOUNT,
    goal: row.size * PANDERO_CUOTA_AMOUNT,
  }));
}

// ---------- Ventas ----------

export async function createSale({
  perfumeId,
  quantity,
  unitPrice,
  paymentType,
  customerName,
  soldByRole,
  soldByName,
  delivered,
}) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: perfumeRows } = await client.query(
      'SELECT stock FROM perfumes WHERE id = $1 FOR UPDATE',
      [perfumeId],
    );
    if (perfumeRows.length === 0) {
      throw new Error('El perfume seleccionado no existe.');
    }
    if (perfumeRows[0].stock < quantity) {
      throw new Error(`No hay suficiente stock (disponible: ${perfumeRows[0].stock}).`);
    }

    let commissionAmount = null;
    if (soldByRole === 'vendedora') {
      const percent = await getCommissionPercent();
      commissionAmount = Math.round(quantity * unitPrice * percent) / 100;
    }

    const { rows } = await client.query(
      `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role, sold_by_name, delivered, commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role,
                 sold_by_name, commission_amount, commission_paid, delivered, created_at`,
      [
        perfumeId,
        quantity,
        unitPrice,
        paymentType,
        customerName || null,
        soldByRole,
        soldByName || null,
        delivered,
        commissionAmount,
      ],
    );
    await client.query('UPDATE perfumes SET stock = stock - $1 WHERE id = $2', [quantity, perfumeId]);
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function setSaleDelivered(id, delivered) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE sales SET delivered = $1 WHERE id = $2 RETURNING id, delivered',
    [delivered, id],
  );
  return rows[0];
}

export async function listPendingDeliveries() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.perfume_id, s.quantity, s.unit_price, s.payment_type, s.customer_name,
           s.sold_by_role, s.sold_by_name, s.created_at,
           f.name AS perfume_name,
           (s.quantity * s.unit_price) AS total,
           COALESCE(SUM(cp.amount), 0) AS paid_amount,
           (s.quantity * s.unit_price) - COALESCE(SUM(cp.amount), 0) AS balance,
           COALESCE(
             array_agg(cp.paid_at ORDER BY cp.paid_at) FILTER (WHERE cp.paid_at IS NOT NULL),
             '{}'
           ) AS payment_dates
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    LEFT JOIN credit_payments cp ON cp.sale_id = s.id
    WHERE s.delivered = false
    GROUP BY s.id, f.name
    ORDER BY s.created_at ASC
  `);
  return rows;
}

export async function updateSale(id, { quantity, unitPrice, paymentType, customerName, soldByRole, soldByName }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query(
      `SELECT perfume_id, quantity, unit_price, payment_type, commission_amount, commission_paid
       FROM sales WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (existingRows.length === 0) {
      throw new Error('La venta no existe.');
    }
    const existing = existingRows[0];
    const perfumeId = existing.perfume_id;

    const financialsChanged =
      Number(existing.quantity) !== quantity ||
      Number(existing.unit_price) !== unitPrice ||
      existing.payment_type !== paymentType;

    // Los abonos que el pandero registra solo al entregar un número no bloquean
    // la edición: se ajustan al nuevo total. Solo bloquean los abonos manuales.
    let hasAutoPayments = false;
    if (financialsChanged) {
      const { rows: paymentRows } = await client.query(
        `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE note IS DISTINCT FROM $2)::int AS manual_count
         FROM credit_payments WHERE sale_id = $1`,
        [id, PANDERO_AUTO_PAYMENT_NOTE],
      );
      if (paymentRows[0].manual_count > 0) {
        throw new Error(
          'No puedes cambiar cantidad, precio o forma de pago: esta venta ya tiene abonos registrados.',
        );
      }
      hasAutoPayments = paymentRows[0].count > 0;
    }

    if (Number(existing.quantity) !== quantity) {
      const { rows: perfumeRows } = await client.query(
        'SELECT stock FROM perfumes WHERE id = $1 FOR UPDATE',
        [perfumeId],
      );
      const availableStock = perfumeRows[0].stock + Number(existing.quantity);
      if (availableStock < quantity) {
        throw new Error(`No hay suficiente stock para esa cantidad (disponible: ${availableStock}).`);
      }
      await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [
        Number(existing.quantity) - quantity,
        perfumeId,
      ]);
    }

    // La comisión ya pagada queda congelada (no se toca aunque cambie cantidad,
    // precio o quién vendió). Si todavía no se pagó, se recalcula con el % actual.
    let commissionAmount = existing.commission_amount;
    if (!existing.commission_paid) {
      if (soldByRole === 'vendedora') {
        const percent = await getCommissionPercent();
        commissionAmount = Math.round(quantity * unitPrice * percent) / 100;
      } else {
        commissionAmount = null;
      }
    }

    const { rows } = await client.query(
      `UPDATE sales
       SET quantity = $1, unit_price = $2, payment_type = $3, customer_name = $4, sold_by_role = $5,
           sold_by_name = $6, commission_amount = $7
       WHERE id = $8
       RETURNING id, perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role,
                 sold_by_name, commission_amount, commission_paid, delivered, created_at`,
      [quantity, unitPrice, paymentType, customerName || null, soldByRole, soldByName, commissionAmount, id],
    );

    if (hasAutoPayments) {
      if (paymentType === 'contado') {
        await client.query('DELETE FROM credit_payments WHERE sale_id = $1', [id]);
      } else {
        await client.query('UPDATE credit_payments SET amount = $1 WHERE sale_id = $2', [
          quantity * unitPrice,
          id,
        ]);
      }
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteSale(id) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: paymentRows } = await client.query(
      `SELECT COUNT(*) FILTER (WHERE note IS DISTINCT FROM $2)::int AS manual_count
       FROM credit_payments WHERE sale_id = $1`,
      [id, PANDERO_AUTO_PAYMENT_NOTE],
    );
    if (paymentRows[0].manual_count > 0) {
      throw new Error('No puedes eliminar esta venta: ya tiene abonos de crédito registrados.');
    }

    const { rows: saleRows } = await client.query(
      'SELECT perfume_id, quantity FROM sales WHERE id = $1',
      [id],
    );
    if (saleRows.length === 0) {
      throw new Error('La venta no existe.');
    }

    await client.query('DELETE FROM credit_payments WHERE sale_id = $1', [id]);
    await client.query('DELETE FROM sales WHERE id = $1', [id]);
    await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [
      saleRows[0].quantity,
      saleRows[0].perfume_id,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listSales() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.perfume_id, s.quantity, s.unit_price, (s.quantity * s.unit_price) AS total,
           s.payment_type, s.customer_name, s.sold_by_role, s.sold_by_name, s.commission_amount,
           s.commission_paid, s.delivered, s.created_at, f.name AS perfume_name
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    ORDER BY s.created_at DESC
  `);
  return rows;
}

/** Fracción de la venta ya cobrada (0 a 1). Al contado se considera cobrada
 * de inmediato; a crédito/pandero depende de los abonos registrados. */
function collectedFraction(paymentType, total, paidAmount) {
  if (paymentType === 'contado' || total <= 0) return 1;
  return Math.min(paidAmount / total, 1);
}

/** Comisión que ya se "ganó" según lo cobrado hasta ahora (no lo pagado a la
 * vendedora, sino lo disponible para pagarle). Redondeada a centavos. */
function commissionAvailable(commissionAmount, paymentType, total, paidAmount) {
  const fraction = collectedFraction(paymentType, total, paidAmount);
  return Math.round(Number(commissionAmount || 0) * fraction * 100) / 100;
}

function withCommissionAvailable(row) {
  const total = Number(row.total);
  const paidAmount = Number(row.paid_amount || 0);
  const available = commissionAvailable(row.commission_amount, row.payment_type, total, paidAmount);
  const paidOut = Number(row.commission_paid_amount || 0);
  return {
    ...row,
    commissionAvailable: available,
    commissionPayoutDue: Math.max(Math.round((available - paidOut) * 100) / 100, 0),
  };
}

export async function listSalesBySeller(role) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT s.id, s.perfume_id, s.quantity, s.unit_price, (s.quantity * s.unit_price) AS total,
            s.payment_type, s.customer_name, s.sold_by_role, s.sold_by_name, s.commission_amount,
            s.commission_paid, s.commission_paid_amount, s.delivered, s.created_at, f.name AS perfume_name,
            COALESCE(SUM(cp.amount), 0) AS paid_amount,
            (s.quantity * s.unit_price) - COALESCE(SUM(cp.amount), 0) AS balance
     FROM sales s
     JOIN perfumes f ON f.id = s.perfume_id
     LEFT JOIN credit_payments cp ON cp.sale_id = s.id
     WHERE s.sold_by_role = $1
     GROUP BY s.id, f.name
     ORDER BY s.created_at DESC`,
    [role],
  );
  return rows.map(withCommissionAvailable);
}

const DEFAULT_COMMISSION_PERCENT = 10;

export async function getCommissionPercent() {
  await ensureSchema();
  const { rows } = await getPool().query("SELECT value FROM settings WHERE key = 'commission_percent'");
  return rows.length > 0 ? Number(rows[0].value) : DEFAULT_COMMISSION_PERCENT;
}

export async function setCommissionPercent(percent) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO settings (key, value) VALUES ('commission_percent', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(percent)],
  );
}

/** Recalcula con el % dado todas las comisiones de vendedora que todavía no
 * se pagaron (las ya pagadas quedan como están, para no alterar el historial). */
export async function recalculateCommissions(percent) {
  await ensureSchema();
  await getPool().query(
    `UPDATE sales
     SET commission_amount = ROUND(quantity * unit_price * $1 / 100, 2)
     WHERE sold_by_role = 'vendedora' AND commission_paid = false`,
    [percent],
  );
}

/** Paga la parte de la comisión que ya está disponible según lo que el
 * cliente lleva pagado (al contado, el 100% de inmediato; a crédito/pandero,
 * proporcional a los abonos registrados). Se puede llamar varias veces a
 * medida que el cliente va abonando: cada vez libera solo el incremento
 * nuevo, nunca más de lo ya cobrado. */
export async function payAvailableCommission(saleId) {
  await ensureSchema();
  const { rows: saleRows } = await getPool().query(
    `SELECT s.payment_type, s.commission_amount, s.commission_paid_amount,
            (s.quantity * s.unit_price) AS total, COALESCE(SUM(cp.amount), 0) AS paid_amount
     FROM sales s
     LEFT JOIN credit_payments cp ON cp.sale_id = s.id
     WHERE s.id = $1
     GROUP BY s.id`,
    [saleId],
  );
  if (saleRows.length === 0) {
    throw new Error('La venta no existe.');
  }
  const sale = saleRows[0];
  const total = Number(sale.total);
  const available = commissionAvailable(sale.commission_amount, sale.payment_type, total, Number(sale.paid_amount));
  const alreadyPaid = Number(sale.commission_paid_amount);

  if (available <= alreadyPaid) {
    throw new Error('Todavía no hay comisión nueva disponible: el cliente no ha pagado lo suficiente.');
  }

  const commissionAmount = Number(sale.commission_amount || 0);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE sales SET commission_paid_amount = $1, commission_paid = $2
       WHERE id = $3
       RETURNING id, commission_amount, commission_paid_amount, commission_paid`,
      [available, available >= commissionAmount, saleId],
    );
    // Cada pago queda con su fecha para poder sumarlo por período en la caja.
    await client.query('INSERT INTO commission_payouts (sale_id, amount) VALUES ($1, $2)', [
      saleId,
      Math.round((available - alreadyPaid) * 100) / 100,
    ]);
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Deshace los pagos de comisión de una venta (por si se marcó por error). */
export async function resetCommissionPayment(saleId) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE sales SET commission_paid_amount = 0, commission_paid = false
       WHERE id = $1
       RETURNING id, commission_amount, commission_paid_amount, commission_paid`,
      [saleId],
    );
    await client.query('DELETE FROM commission_payouts WHERE sale_id = $1', [saleId]);
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Crédito / pandero ----------

export async function listCreditSales() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.perfume_id, s.quantity, s.unit_price, s.payment_type, s.customer_name,
           s.sold_by_role, s.delivered, s.created_at,
           f.name AS perfume_name,
           (s.quantity * s.unit_price) AS total,
           COALESCE(SUM(cp.amount), 0) AS paid_amount,
           (s.quantity * s.unit_price) - COALESCE(SUM(cp.amount), 0) AS balance
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    LEFT JOIN credit_payments cp ON cp.sale_id = s.id
    WHERE s.payment_type IN ('credito', 'pandero')
    GROUP BY s.id, f.name
    ORDER BY s.customer_name ASC, s.created_at DESC
  `);
  return rows;
}

export async function addCreditPayment({ saleId, amount, note }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: saleRows } = await client.query(
      `SELECT (s.quantity * s.unit_price) AS total, COALESCE(SUM(cp.amount), 0) AS paid
       FROM sales s
       LEFT JOIN credit_payments cp ON cp.sale_id = s.id
       WHERE s.id = $1 AND s.payment_type IN ('credito', 'pandero')
       GROUP BY s.id`,
      [saleId],
    );
    if (saleRows.length === 0) {
      throw new Error('La venta a crédito o pandero no existe.');
    }
    const balance = Number(saleRows[0].total) - Number(saleRows[0].paid);
    if (amount > balance) {
      throw new Error(`El abono no puede superar el saldo pendiente (S/ ${balance.toFixed(2)}).`);
    }

    const { rows } = await client.query(
      `INSERT INTO credit_payments (sale_id, amount, note)
       VALUES ($1, $2, $3)
       RETURNING id, sale_id, amount, note, paid_at`,
      [saleId, amount, note || null],
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Resumen ----------

export async function getSummary(role, period = 'mes') {
  await ensureSchema();
  const pool = getPool();

  if (role === 'vendedora') {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS sales_count,
        COALESCE(SUM(s.quantity * s.unit_price), 0) AS sales_total,
        COALESCE(SUM(
          CASE WHEN s.payment_type = 'contado' OR (s.quantity * s.unit_price) <= 0
            THEN COALESCE(s.commission_amount, 0)
            ELSE COALESCE(s.commission_amount, 0)
                 * LEAST(COALESCE(cp.paid_amount, 0) / (s.quantity * s.unit_price), 1)
          END
        ), 0) AS commission_available_total,
        COALESCE(SUM(s.commission_paid_amount), 0) AS commission_paid_total
      FROM sales s
      LEFT JOIN (
        SELECT sale_id, SUM(amount) AS paid_amount FROM credit_payments GROUP BY sale_id
      ) cp ON cp.sale_id = s.id
      WHERE s.sold_by_role = 'vendedora'
    `);
    const commissionAvailableTotal = Number(rows[0].commission_available_total);
    const commissionPaidTotal = Number(rows[0].commission_paid_total);
    return {
      role,
      salesCount: rows[0].sales_count,
      salesTotal: rows[0].sales_total,
      commissionPending: Math.max(commissionAvailableTotal - commissionPaidTotal, 0),
      commissionPaidTotal,
    };
  }

  const { start, end } = periodRange(period);
  const range = [start, end];

  const [saleStats, costOfGoodsSold, creditPending, commissionPending, lowStock, pendingDeliveries, flow, panderoInProgress] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total,
                COALESCE(SUM(commission_amount), 0) AS commissions
         FROM sales WHERE ${inRange('created_at')}`,
        range,
      ),
      pool.query(
        `SELECT COALESCE(SUM(s.quantity * pc.avg_unit_cost), 0) AS total
         FROM sales s
         JOIN (
           SELECT perfume_id, SUM(quantity * unit_cost + freight_cost) / SUM(quantity) AS avg_unit_cost
           FROM purchases
           GROUP BY perfume_id
         ) pc ON pc.perfume_id = s.perfume_id
         WHERE ${inRange('s.created_at')}`,
        range,
      ),
      pool.query(`
        SELECT COALESCE(SUM(s.quantity * s.unit_price - COALESCE(cp.paid, 0)), 0) AS total
        FROM sales s
        LEFT JOIN (SELECT sale_id, SUM(amount) AS paid FROM credit_payments GROUP BY sale_id) cp
          ON cp.sale_id = s.id
        WHERE s.payment_type IN ('credito', 'pandero')
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(
            CASE WHEN s.payment_type = 'contado' OR (s.quantity * s.unit_price) <= 0
              THEN COALESCE(s.commission_amount, 0)
              ELSE COALESCE(s.commission_amount, 0)
                   * LEAST(COALESCE(cp.paid_amount, 0) / (s.quantity * s.unit_price), 1)
            END
          ), 0) AS available_total,
          COALESCE(SUM(s.commission_paid_amount), 0) AS paid_total
        FROM sales s
        LEFT JOIN (
          SELECT sale_id, SUM(amount) AS paid_amount FROM credit_payments GROUP BY sale_id
        ) cp ON cp.sale_id = s.id
      `),
      pool.query('SELECT COUNT(*)::int AS count FROM perfumes WHERE stock <= 3 AND price > 0'),
      pool.query('SELECT COUNT(*)::int AS count FROM sales WHERE delivered = false'),
      getCashFlow({ start, end }),
      getPanderoInProgress(),
    ]);

  const salesTotal = Number(saleStats.rows[0].total);
  // Costo con el costo promedio de compra de cada perfume (incluye flete). Un
  // perfume vendido sin ninguna compra registrada todavía no aporta costo.
  const estimatedCost = Number(costOfGoodsSold.rows[0].total);
  const commissionsEarned = Number(saleStats.rows[0].commissions);
  const salesProfit = salesTotal - estimatedCost - commissionsEarned;

  return {
    role,
    period,
    flow,
    salesCount: saleStats.rows[0].count,
    salesTotal,
    estimatedCost,
    commissionsEarned,
    salesProfit,
    panderoInProgress,
    creditPending: Number(creditPending.rows[0].total),
    commissionPending: Math.max(
      Number(commissionPending.rows[0].available_total) - Number(commissionPending.rows[0].paid_total),
      0,
    ),
    lowStockCount: lowStock.rows[0].count,
    pendingDeliveriesCount: pendingDeliveries.rows[0].count,
  };
}

// ---------- Usuarios (solo admin) ----------

export async function createUser({ username, passwordHash, name, role }) {
  await ensureSchema();
  try {
    const { rows } = await getPool().query(
      `INSERT INTO users (username, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, name, role, active, created_at`,
      [username, passwordHash, name, role],
    );
    return rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Ese nombre de usuario ya existe.');
    }
    throw error;
  }
}

export async function listUsers() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, username, name, role, active, created_at FROM users ORDER BY created_at ASC',
  );
  return rows;
}

export async function findUserByUsername(username) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, username, password_hash, name, role, active FROM users WHERE username = $1',
    [username],
  );
  return rows[0] || null;
}

export async function setUserActive(id, active) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE users SET active = $1 WHERE id = $2 RETURNING id, active',
    [active, id],
  );
  return rows[0];
}

export async function resetUserPassword(id, passwordHash) {
  await ensureSchema();
  const { rows } = await getPool().query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [
    passwordHash,
    id,
  ]);
  return rows[0];
}

// ---------- Pedidos (compromisos de clientes por productos sin stock aún) ----------

/** Crea un pedido con uno o varios perfumes a la vez (un cliente puede pedir
 * varias cosas en un solo encargo). Todas las líneas comparten un mismo
 * código autocorrelativo (ej. PED-0001) para poder identificar el pedido
 * completo aunque tenga varios perfumes. */
export async function createOrderBatch({ customerName, note, items }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: codeRows } = await client.query(
      `SELECT 'PED-' || LPAD(nextval('order_code_seq')::text, 4, '0') AS code`,
    );
    const orderCode = codeRows[0].code;

    const created = [];
    for (const item of items) {
      const { rows } = await client.query(
        `INSERT INTO orders (perfume_id, customer_name, quantity, note, order_code)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, perfume_id, customer_name, quantity, note, order_code, fulfilled, created_at`,
        [item.perfumeId, customerName, item.quantity, note || null, orderCode],
      );
      created.push(rows[0]);
    }

    await client.query('COMMIT');
    return { orderCode, orders: created };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateOrder(id, { perfumeId, customerName, quantity, note }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE orders SET perfume_id = $1, customer_name = $2, quantity = $3, note = $4
     WHERE id = $5
     RETURNING id, perfume_id, customer_name, quantity, note, order_code, fulfilled, created_at`,
    [perfumeId, customerName, quantity, note || null, id],
  );
  return rows[0];
}

export async function listOrders() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT o.id, o.perfume_id, o.customer_name, o.quantity, o.note, o.order_code, o.fulfilled, o.stocked,
           o.created_at, f.name AS perfume_name, f.stock AS perfume_stock,
           best.supplier_name AS best_supplier_name,
           best.tier_label AS best_tier_label,
           best.price AS best_price
    FROM orders o
    JOIN perfumes f ON f.id = o.perfume_id
    LEFT JOIN LATERAL (
      SELECT s.name AS supplier_name, sp.tier_label, sp.price
      FROM supplier_prices sp
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.perfume_id = f.id
      ORDER BY sp.price ASC
      LIMIT 1
    ) best ON true
    ORDER BY o.fulfilled ASC, o.created_at ASC
  `);
  return rows;
}

/** Ingresa a stock lo que ya se compró de los pedidos, sin pasar por Compras:
 * por cada pedido registra una compra (con su costo unitario, para no perder
 * el costo en Resumen/ganancias), suma la cantidad al stock del perfume y
 * marca el pedido como ingresado para no sumarlo dos veces. */
export async function receiveOrdersToStock(lines) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const line of lines) {
      const { rows } = await client.query(
        `SELECT id, perfume_id, quantity, customer_name, order_code, stocked
         FROM orders WHERE id = $1 FOR UPDATE`,
        [line.orderId],
      );
      const order = rows[0];
      if (!order) throw new Error('Uno de los pedidos ya no existe.');
      if (order.stocked) throw new Error('Uno de los pedidos ya se había ingresado a stock.');

      const note = `Pedido ${order.order_code || `#${order.id}`} · ${order.customer_name}`;
      await client.query(
        `INSERT INTO purchases (perfume_id, quantity, unit_cost, freight_cost, note)
         VALUES ($1, $2, $3, 0, $4)`,
        [order.perfume_id, order.quantity, line.unitCost, note],
      );
      await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [
        order.quantity,
        order.perfume_id,
      ]);
      await client.query('UPDATE orders SET stocked = true WHERE id = $1', [order.id]);
    }
    await client.query('COMMIT');
    return { count: lines.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Por cada perfume con pedidos pendientes, cuánto se pidió en total, cuánto
 * stock hay ahora, y cuánto falta comprar para cubrir todos esos pedidos. */
export async function listOrderShortfalls() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT f.id AS perfume_id, f.name AS perfume_name, f.stock AS perfume_stock,
           SUM(o.quantity)::int AS ordered_quantity,
           GREATEST(SUM(o.quantity) - f.stock, 0)::int AS shortfall,
           best.supplier_name AS best_supplier_name,
           best.tier_label AS best_tier_label,
           best.price AS best_price
    FROM orders o
    JOIN perfumes f ON f.id = o.perfume_id
    LEFT JOIN LATERAL (
      SELECT s.name AS supplier_name, sp.tier_label, sp.price
      FROM supplier_prices sp
      JOIN suppliers s ON s.id = sp.supplier_id
      WHERE sp.perfume_id = f.id
      ORDER BY sp.price ASC
      LIMIT 1
    ) best ON true
    WHERE o.fulfilled = false
    GROUP BY f.id, f.name, f.stock, best.supplier_name, best.tier_label, best.price
    HAVING GREATEST(SUM(o.quantity) - f.stock, 0) > 0
    ORDER BY shortfall DESC
  `);
  return rows;
}

export async function setOrderFulfilled(id, fulfilled) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE orders SET fulfilled = $1 WHERE id = $2 RETURNING id, fulfilled',
    [fulfilled, id],
  );
  return rows[0];
}

export async function deleteOrder(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM orders WHERE id = $1', [id]);
}

// ---------- Panderos (rondas numeradas: quién recibe qué y cuándo) ----------

export async function createPanderoGroup({ name, startDate, intervalDays }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO pandero_groups (name, start_date, interval_days)
     VALUES ($1, $2, $3)
     RETURNING id, name, start_date, interval_days, created_at`,
    [name, startDate, intervalDays],
  );
  return rows[0];
}

export async function deletePanderoGroup(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM pandero_groups WHERE id = $1', [id]);
}

export async function addPanderoEntry({ groupId, customerName, perfumeId }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO pandero_entries (group_id, position, customer_name, perfume_id)
     VALUES (
       $1,
       COALESCE((SELECT MAX(position) FROM pandero_entries WHERE group_id = $1), 0) + 1,
       $2,
       $3
     )
     RETURNING id, group_id, position, customer_name, perfume_id, fulfilled, created_at`,
    [groupId, customerName, perfumeId],
  );
  return rows[0];
}

export async function setPanderoEntryFulfilled(id, fulfilled, { soldByRole, soldByName } = {}) {
  await ensureSchema();

  // Entregar el turno de la semana cierra el ciclo de cobro para todo el
  // grupo: quienes estaban marcados como "Pagando" quedan guardados como los
  // que pagaron en ese número (historial + total del Resumen) y todos vuelven
  // a "Sin pagar" para la semana nueva.
  if (!fulfilled) {
    const { rows } = await getPool().query(
      'UPDATE pandero_entries SET fulfilled = $1 WHERE id = $2 RETURNING id, fulfilled',
      [fulfilled, id],
    );
    return rows[0];
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: entryRows } = await client.query(
      `SELECT id, group_id, perfume_id, customer_name, round_recorded
       FROM pandero_entries WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const entry = entryRows[0];
    if (entry) {
      // No se puede entregar un perfume que no está en stock. Solo aplica a la
      // primera entrega (la que descuenta stock); si se falla, no se cambia nada.
      if (!entry.round_recorded) {
        const { rows: stockRows } = await client.query(
          'SELECT name, stock FROM perfumes WHERE id = $1 FOR UPDATE',
          [entry.perfume_id],
        );
        const perfume = stockRows[0];
        if (!perfume || perfume.stock < 1) {
          throw new Error(
            `No hay stock de "${perfume?.name || 'este perfume'}" para entregarlo. Ingresa stock primero (Compras o Pedidos).`,
          );
        }
      }

      await client.query(
        'UPDATE pandero_entries SET fulfilled = true, round_recorded = true WHERE id = $1',
        [entry.id],
      );
      await client.query(
        `INSERT INTO pandero_round_payments (group_id, round_entry_id, payer_entry_id, payer_name, amount)
         SELECT group_id, $1, id, customer_name, $2
         FROM pandero_entries WHERE group_id = $3 AND paying = true`,
        [entry.id, PANDERO_CUOTA_AMOUNT, entry.group_id],
      );
      await client.query('UPDATE pandero_entries SET paying = false WHERE group_id = $1', [
        entry.group_id,
      ]);

      // Entregar el perfume del pandero es, en la práctica, una venta más: se
      // registra como venta (payment_type 'pandero') para que la vendedora
      // gane su comisión, igual que en cualquier otra venta. El valor de la
      // venta es el total que junta el pandero en cada número (participantes ×
      // cuota semanal, ej. 10 × S/ 20 = S/ 200), no el precio de catálogo del
      // perfume. Como ya se cobró por adelantado con las cuotas semanales (no
      // con abonos de crédito normales), se registra de una vez como cobrada al
      // 100% para que la comisión quede disponible para pagar desde ya. Solo se
      // registra en la primera entrega: si se marca "pendiente" y se vuelve a
      // entregar no se duplica la venta ni el descuento de stock.
      if (!entry.round_recorded) {
        const { rows: sizeRows } = await client.query(
          'SELECT COUNT(*)::int AS count FROM pandero_entries WHERE group_id = $1',
          [entry.group_id],
        );
        const potValue = sizeRows[0].count * PANDERO_CUOTA_AMOUNT;

        let commissionAmount = null;
        if (soldByRole === 'vendedora') {
          const percent = await getCommissionPercent();
          commissionAmount = Math.round(potValue * percent) / 100;
        }
        const { rows: saleRows } = await client.query(
          `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role, sold_by_name, delivered, commission_amount)
           VALUES ($1, 1, $2, 'pandero', $3, $4, $5, true, $6)
           RETURNING id`,
          [
            entry.perfume_id,
            potValue,
            entry.customer_name,
            soldByRole || 'admin',
            soldByName || null,
            commissionAmount,
          ],
        );
        await client.query(
          'INSERT INTO credit_payments (sale_id, amount, note) VALUES ($1, $2, $3)',
          [saleRows[0].id, potValue, PANDERO_AUTO_PAYMENT_NOTE],
        );
        await client.query('UPDATE perfumes SET stock = stock - 1 WHERE id = $1', [entry.perfume_id]);
      }
    }
    await client.query('COMMIT');
    return entry ? { id: entry.id, fulfilled: true } : undefined;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function setPanderoEntryPaying(id, paying) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE pandero_entries SET paying = $1 WHERE id = $2 RETURNING id, paying',
    [paying, id],
  );
  return rows[0];
}

/** Corrige (o completa) quiénes pagaron en un número ya entregado. Reemplaza
 * los pagos guardados de los participantes actuales por los marcados; los de
 * participantes que ya no están en la lista se conservan. Si ese número se
 * cerró antes de existir el historial, lo que ya estaba contado en
 * cuotas_total se descuenta para no sumarlo dos veces en el Resumen. */
export async function setPanderoRoundPayers(roundEntryId, payerEntryIds) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: roundRows } = await client.query(
      'SELECT id, group_id, fulfilled, round_recorded FROM pandero_entries WHERE id = $1 FOR UPDATE',
      [roundEntryId],
    );
    const round = roundRows[0];
    if (!round) throw new Error('El número no existe.');
    if (!round.fulfilled) throw new Error('Ese número todavía no se entregó.');

    await client.query(
      'DELETE FROM pandero_round_payments WHERE round_entry_id = $1 AND payer_entry_id IS NOT NULL',
      [round.id],
    );
    const { rowCount } = await client.query(
      `INSERT INTO pandero_round_payments (group_id, round_entry_id, payer_entry_id, payer_name, amount)
       SELECT group_id, $1, id, customer_name, $2
       FROM pandero_entries WHERE group_id = $3 AND id = ANY($4::int[])`,
      [round.id, PANDERO_CUOTA_AMOUNT, round.group_id, payerEntryIds],
    );

    if (!round.round_recorded) {
      await client.query(
        'UPDATE pandero_groups SET cuotas_total = GREATEST(cuotas_total - $1, 0) WHERE id = $2',
        [rowCount * PANDERO_CUOTA_AMOUNT, round.group_id],
      );
      await client.query('UPDATE pandero_entries SET round_recorded = true WHERE id = $1', [round.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePanderoEntry(id, { customerName, perfumeId }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE pandero_entries SET customer_name = $1, perfume_id = $2 WHERE id = $3
     RETURNING id, customer_name, perfume_id`,
    [customerName, perfumeId, id],
  );
  return rows[0];
}

export async function deletePanderoEntry(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM pandero_entries WHERE id = $1', [id]);
}

export async function listPanderoGroups() {
  await ensureSchema();
  const { rows: groups } = await getPool().query(
    'SELECT id, name, start_date, interval_days, created_at FROM pandero_groups ORDER BY start_date DESC',
  );
  const { rows: entries } = await getPool().query(`
    SELECT e.id, e.group_id, e.position, e.customer_name, e.perfume_id, e.fulfilled, e.paying,
           e.round_recorded, e.created_at,
           COALESCE(
             (SELECT json_agg(
                json_build_object('payer_entry_id', rp.payer_entry_id, 'payer_name', rp.payer_name, 'amount', rp.amount)
                ORDER BY rp.id)
              FROM pandero_round_payments rp WHERE rp.round_entry_id = e.id),
             '[]'::json
           ) AS round_payments,
           f.name AS perfume_name, f.stock AS perfume_stock,
           (g.start_date + (e.position - 1) * g.interval_days * INTERVAL '1 day')::date AS turn_date
    FROM pandero_entries e
    JOIN perfumes f ON f.id = e.perfume_id
    JOIN pandero_groups g ON g.id = e.group_id
    ORDER BY e.group_id, e.position ASC
  `);
  return groups.map((group) => ({
    ...group,
    entries: entries.filter((entry) => entry.group_id === group.id),
  }));
}

// ---------- Proveedores (comparar precios de compra) ----------

export async function createSupplier({ name, note }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO suppliers (name, note) VALUES ($1, $2)
     RETURNING id, name, note, created_at`,
    [name, note || null],
  );
  return rows[0];
}

export async function deleteSupplier(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM suppliers WHERE id = $1', [id]);
}

export async function listSuppliers() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, name, note, created_at FROM suppliers ORDER BY name ASC',
  );
  return rows;
}

export async function upsertSupplierPrice({ supplierId, perfumeId, tierLabel, price }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO supplier_prices (supplier_id, perfume_id, tier_label, price)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (supplier_id, perfume_id, tier_label) DO UPDATE SET price = EXCLUDED.price
     RETURNING id, supplier_id, perfume_id, tier_label, price, created_at`,
    [supplierId, perfumeId, tierLabel, price],
  );
  return rows[0];
}

export async function deleteSupplierPrice(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM supplier_prices WHERE id = $1', [id]);
}

/** Guarda el precio de un producto que el proveedor sí vende pero que todavía
 * no existe en tu catálogo (no se puede vincular a un perfume_id). Se
 * identifica por su nombre tal cual lo escribió el proveedor. */
async function upsertUnlinkedSupplierPrice({ supplierId, productName, tierLabel, price }) {
  const { rows: existing } = await getPool().query(
    `SELECT id FROM supplier_prices
     WHERE supplier_id = $1 AND perfume_id IS NULL AND tier_label = $2 AND lower(product_name) = lower($3)`,
    [supplierId, tierLabel, productName],
  );
  if (existing.length > 0) {
    const { rows } = await getPool().query(
      `UPDATE supplier_prices SET price = $1 WHERE id = $2
       RETURNING id, supplier_id, perfume_id, product_name, tier_label, price, created_at`,
      [price, existing[0].id],
    );
    return rows[0];
  }
  const { rows } = await getPool().query(
    `INSERT INTO supplier_prices (supplier_id, perfume_id, product_name, tier_label, price)
     VALUES ($1, NULL, $2, $3, $4)
     RETURNING id, supplier_id, perfume_id, product_name, tier_label, price, created_at`,
    [supplierId, productName, tierLabel, price],
  );
  return rows[0];
}

// Normaliza un nombre de producto para poder emparejar "HAWAS ICE RASASI 100 ML"
// con el "Hawas Ice" que ya existe en el catálogo, ignorando tamaño/formulación
// y mayúsculas. Ojo: NO se quita "for him"/"for her"/"women" porque en muchos
// perfumes eso es parte real del nombre (ej. "Hawas For Him" es un producto
// distinto de "Hawas Ice", no un simple sufijo genérico).
function normalizeProductName(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\d+\s*(ml|k)\b/gi, ' ')
    .replace(/\b(edp|edt|extrait|eau de parfum|eau de toilette)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Igual que normalizeProductName pero conservando mayúsculas/minúsculas
// originales, para usar como nombre para mostrar cuando un producto de un
// proveedor no existe todavía en el catálogo (sin ml/edp de por medio).
function cleanProductLabel(text) {
  return String(text || '')
    .replace(/\d+\s*(ml|k)\b/gi, ' ')
    .replace(/\b(edp|edt|extrait|eau de parfum|eau de toilette)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchPerfumeByName(perfumes, rawName) {
  const normalized = normalizeProductName(rawName);
  if (!normalized) return { match: null, ambiguous: false };

  const exact = perfumes.find((p) => normalizeProductName(p.name) === normalized);
  if (exact) return { match: exact, ambiguous: false };

  const contained = perfumes.filter((p) => {
    const pName = normalizeProductName(p.name);
    return pName && (normalized.includes(pName) || pName.includes(normalized));
  });
  if (contained.length === 1) return { match: contained[0], ambiguous: false };
  if (contained.length === 0) {
    // Respaldo: alguien tipeó "9PM" sin espacio y el catálogo tiene "9 PM".
    // Se repite la comparación ignorando espacios antes de rendirse.
    const tight = normalized.replace(/\s+/g, '');
    const tightExact = perfumes.find((p) => normalizeProductName(p.name).replace(/\s+/g, '') === tight);
    if (tightExact) return { match: tightExact, ambiguous: false };
  }
  if (contained.length > 1) return { match: null, ambiguous: true };
  return { match: null, ambiguous: false };
}

/** Separa una línea pegada en "producto" + "precio". Si viene de pegar celdas
 * de una hoja de cálculo, las columnas llegan separadas por tab (se usa la
 * última celda como precio). Si no, se busca el último número de la línea
 * (con "S/" opcional adelante) y todo lo anterior es el nombre del producto. */
function splitProductAndPrice(line) {
  if (line.includes('\t')) {
    const cells = line
      .split('\t')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length >= 2) {
      return { productRaw: cells.slice(0, -1).join(' '), priceRaw: cells[cells.length - 1] };
    }
  }

  const match = line.match(/^(.*?)[\s:,–—-]+(?:s\/\.?\s*)?(\d+(?:[.,]\d{1,2})?)\s*$/i);
  if (!match) return null;
  return { productRaw: match[1].trim(), priceRaw: match[2] };
}

/** Pega varias líneas "Producto: Precio" (o separadas por tab, como al copiar
 * de una hoja de cálculo) de una sola vez para un proveedor + nivel de
 * precio, emparejando cada producto contra el catálogo ya existente. Si un
 * producto no existe en el catálogo igual se guarda (sin vincular a ningún
 * perfume) para que aparezca en la comparación de precios como algo que el
 * proveedor sí ofrece pero que tú todavía no vendes. Solo queda sin guardar
 * lo que no se pudo leer (falta el precio) o lo que es ambiguo (coincide con
 * más de un perfume del catálogo). */
export async function bulkUpsertSupplierPrices({ supplierId, tierLabel, rawText }) {
  await ensureSchema();
  const perfumes = await listPerfumes();

  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const matched = [];
  const unlinked = [];
  const ambiguous = [];
  const failed = [];

  for (const line of lines) {
    const split = splitProductAndPrice(line);
    if (!split) {
      failed.push({ line, reason: 'No se encontró un precio en la línea.' });
      continue;
    }
    const { productRaw } = split;
    const price = Number(String(split.priceRaw).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!productRaw || Number.isNaN(price) || price <= 0) {
      failed.push({ line, reason: 'No se pudo leer el producto o el precio.' });
      continue;
    }

    const { match, ambiguous: isAmbiguous } = matchPerfumeByName(perfumes, productRaw);
    if (isAmbiguous) {
      ambiguous.push({ line, productRaw });
      continue;
    }
    if (!match) {
      const cleanName = cleanProductLabel(productRaw) || productRaw;
      const saved = await upsertUnlinkedSupplierPrice({ supplierId, productName: cleanName, tierLabel, price });
      unlinked.push({ line, perfumeName: cleanName, price: saved.price });
      continue;
    }

    const saved = await upsertSupplierPrice({ supplierId, perfumeId: match.id, tierLabel, price });
    matched.push({ line, perfumeName: match.name, price: saved.price });
  }

  return { matched, unlinked, ambiguous, failed };
}

export async function listSupplierPrices(supplierId) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT sp.id, sp.perfume_id, sp.tier_label, sp.price, sp.created_at,
            COALESCE(f.name, sp.product_name) AS perfume_name,
            (sp.perfume_id IS NULL) AS unlinked
     FROM supplier_prices sp
     LEFT JOIN perfumes f ON f.id = sp.perfume_id
     WHERE sp.supplier_id = $1
     ORDER BY perfume_name ASC, sp.price ASC`,
    [supplierId],
  );
  return rows;
}

/** Por cada perfume con al menos un precio de proveedor registrado, todas las
 * opciones (proveedor + nivel + precio) ordenadas de más barata a más cara. */
export async function listPriceComparison() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT sp.perfume_id, COALESCE(f.name, sp.product_name) AS perfume_name, sp.id, sp.tier_label, sp.price,
           s.id AS supplier_id, s.name AS supplier_name
    FROM supplier_prices sp
    LEFT JOIN perfumes f ON f.id = sp.perfume_id
    JOIN suppliers s ON s.id = sp.supplier_id
    ORDER BY COALESCE(f.name, sp.product_name) ASC, sp.price ASC
  `);

  // Los perfumes del catálogo se agrupan por perfume_id. Los que un proveedor
  // ofrece pero que todavía no están en el catálogo (perfume_id NULL) se
  // agrupan por nombre normalizado, para no perderlos de la comparación.
  const byGroup = new Map();
  for (const row of rows) {
    const isLinked = row.perfume_id != null;
    const groupKey = isLinked ? `p${row.perfume_id}` : `u${normalizeProductName(row.perfume_name)}`;
    if (!byGroup.has(groupKey)) {
      byGroup.set(groupKey, {
        perfumeId: row.perfume_id,
        perfumeName: row.perfume_name,
        unlinked: !isLinked,
        options: [],
      });
    }
    byGroup.get(groupKey).options.push({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      tierLabel: row.tier_label,
      price: row.price,
    });
  }
  return Array.from(byGroup.values());
}
