import { Pool } from 'pg';
import { PANDERO_CUOTA_AMOUNT, PANDERO_AUTO_PAYMENT_NOTE } from './pandero';
import { LOSS_REASONS } from './loss-reasons';
import { bestWholesaleOption, catalogName, salePrice } from './supplier-pricing';
import { NAME_ALIASES, findPerfumeInfo, perfumeInfoKey } from './perfume-info';
import { guessExpenseCategory } from './expense-categories';
import {
  PF_CATEGORY_KEYS,
  PF_DEFAULT_PERCENTS,
  PF_CATEGORIES,
  PF_MANUAL_OUTFLOW_CATEGORIES,
} from './profit-first';

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

      -- Con qué dinero se pagó: 'capital' (bolsillo del dueño) o 'ganancias' (reinversión).
      ALTER TABLE purchases ADD COLUMN IF NOT EXISTS paid_with TEXT NOT NULL DEFAULT 'capital';
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_with TEXT NOT NULL DEFAULT 'capital';

      -- Pérdidas de producto (rotura, robo, vencido, regalo…). unit_cost es el
      -- costo promedio de compra del perfume al momento de registrarla.
      CREATE TABLE IF NOT EXISTS stock_losses (
        id SERIAL PRIMARY KEY,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        quantity INTEGER NOT NULL,
        unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        note TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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

      -- Reparto tipo "Profit First": planes de porcentajes con fecha de vigencia
      -- (cambiar un porcentaje no reescribe el historial) y salidas manuales.
      CREATE TABLE IF NOT EXISTS pf_plans (
        id SERIAL PRIMARY KEY,
        effective_from DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS pf_plan_items (
        plan_id INTEGER NOT NULL REFERENCES pf_plans(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        percent NUMERIC(5,2) NOT NULL,
        PRIMARY KEY (plan_id, category)
      );
      CREATE TABLE IF NOT EXISTS pf_outflows (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
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
      -- Marca (Lattafa, Armaf…). Si está vacía, la tienda la deduce del nombre (lib/brands.js).
      ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS brand TEXT;

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

      -- ---------- Pagos: categorías de gasto y deudas con saldo ----------
      -- Categoría del gasto (lib/expense-categories.js). Los antiguos se
      -- clasifican solos por su descripción la primera vez que se listan.
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT;
      -- "¿Para qué?" de cada "Puse dinero" / "Saqué para mí" (lib/cash-purposes.js).
      ALTER TABLE cash_movements ADD COLUMN IF NOT EXISTS purpose TEXT;

      CREATE TABLE IF NOT EXISTS debts (
        id SERIAL PRIMARY KEY,
        creditor TEXT NOT NULL,
        description TEXT,
        total NUMERIC(10,2) NOT NULL,
        due_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS debt_payments (
        id SERIAL PRIMARY KEY,
        debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
        amount NUMERIC(10,2) NOT NULL,
        paid_with TEXT NOT NULL DEFAULT 'ganancias',
        note TEXT,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- ---------- Envíos por Shalom (salientes a clientes y entrantes de proveedores) ----------
      CREATE TABLE IF NOT EXISTS shalom_shipments (
        id SERIAL PRIMARY KEY,
        direction TEXT NOT NULL,
        order_number TEXT NOT NULL,
        order_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'registrado',
        contact_name TEXT,
        contact_phone TEXT,
        origin TEXT,
        destination TEXT,
        note TEXT,
        web_order_id INTEGER REFERENCES web_orders(id) ON DELETE SET NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (order_number, order_code)
      );
      CREATE INDEX IF NOT EXISTS shalom_shipments_web_order_idx ON shalom_shipments (web_order_id);

      CREATE TABLE IF NOT EXISTS shalom_shipment_events (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER NOT NULL REFERENCES shalom_shipments(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        note TEXT,
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
    'SELECT id, name, brand, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at FROM perfumes ORDER BY created_at DESC',
  );
  return rows;
}

export async function createPerfume({ name, brand, price, imageUrl, videoUrl, description, category, comparePrice, featured, notes }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO perfumes (name, price, image_url, video_url, description, category, compare_price, featured, notes, brand)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, name, brand, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at`,
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
      brand || null,
    ],
  );
  await relinkAfterPerfumeChange();
  return rows[0];
}

// Un perfume nuevo o renombrado puede ser el que faltaba para precios de
// proveedor cargados antes. Si esto falla, el perfume igual queda guardado.
async function relinkAfterPerfumeChange() {
  try {
    await relinkSupplierPrices();
  } catch (error) {
    console.error('No se pudieron revincular los precios de proveedor:', error);
  }
}

export async function updatePerfume(
  id,
  { name, brand, price, imageUrl, videoUrl, description, category, stock, comparePrice, featured, notes },
) {
  await ensureSchema();
  // stock es opcional: solo se pasa desde "Editar perfume" para corregir el
  // stock a mano; si no viene, se deja como está.
  const { rows } = await getPool().query(
    `UPDATE perfumes
     SET name = $1, price = $2, image_url = $3, video_url = $4, description = $5, category = $6,
         stock = COALESCE($8, stock), compare_price = $9, featured = $10, notes = $11, brand = $12
     WHERE id = $7
     RETURNING id, name, brand, price, compare_price, featured, notes, image_url, video_url, description, stock, category, created_at`,
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
      brand || null,
    ],
  );
  await relinkAfterPerfumeChange();
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

export async function createPurchase({ perfumeId, quantity, unitCost, freightCost, marginPerUnit, note, paidWith }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO purchases (perfume_id, quantity, unit_cost, freight_cost, note, paid_with)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, perfume_id, quantity, unit_cost, freight_cost, note, paid_with, created_at`,
      [perfumeId, quantity, unitCost, freightCost || 0, note || null, paidWith],
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

export async function updatePurchase(id, { quantity, unitCost, freightCost, marginPerUnit, note, paidWith }) {
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
      `UPDATE purchases SET quantity = $1, unit_cost = $2, freight_cost = $3, note = $4, paid_with = $5
       WHERE id = $6
       RETURNING id, perfume_id, quantity, unit_cost, freight_cost, note, paid_with, created_at`,
      [quantity, unitCost, freightCost || 0, note || null, paidWith, id],
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
    SELECT p.id, p.perfume_id, p.quantity, p.unit_cost, p.freight_cost, p.note, p.paid_with, p.created_at,
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

export async function createExpense({ description, amount, note, paidWith, category }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO expenses (description, amount, note, paid_with, category)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, description, amount, note, paid_with, category, created_at`,
    [description, amount, note || null, paidWith, category || guessExpenseCategory(description)],
  );
  return rows[0];
}

export async function listExpenses() {
  await ensureSchema();
  // Los gastos registrados antes de existir las categorías se clasifican una
  // sola vez según su descripción (se pueden corregir editándolos).
  const { rows: pending } = await getPool().query(
    'SELECT id, description FROM expenses WHERE category IS NULL',
  );
  for (const row of pending) {
    await getPool().query('UPDATE expenses SET category = $1 WHERE id = $2', [
      guessExpenseCategory(row.description),
      row.id,
    ]);
  }
  const { rows } = await getPool().query(
    'SELECT id, description, amount, note, paid_with, category, created_at FROM expenses ORDER BY created_at DESC',
  );
  return rows;
}

export async function updateExpense(id, { description, amount, note, paidWith, category }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE expenses SET description = $1, amount = $2, note = $3, paid_with = $4, category = $5
     WHERE id = $6
     RETURNING id, description, amount, note, paid_with, category, created_at`,
    [description, amount, note || null, paidWith, category || guessExpenseCategory(description), id],
  );
  return rows[0];
}

export async function deleteExpense(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM expenses WHERE id = $1', [id]);
}

// ---------- Pérdidas de producto ----------

/** Descuenta el stock y guarda la pérdida valorizada al costo promedio de compra. */
export async function createStockLoss({ perfumeId, quantity, reason, note, occurredAt }) {
  await ensureSchema();
  if (!LOSS_REASONS[reason]) throw new Error('Elige el motivo de la pérdida.');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: perfumeRows } = await client.query(
      'SELECT name, stock FROM perfumes WHERE id = $1 FOR UPDATE',
      [perfumeId],
    );
    const perfume = perfumeRows[0];
    if (!perfume) throw new Error('El perfume no existe.');
    if (perfume.stock < quantity) {
      throw new Error(`Solo tienes ${perfume.stock} unidad(es) de ${perfume.name} en stock.`);
    }
    const { rows: costRows } = await client.query(
      `SELECT COALESCE(SUM(quantity * unit_cost + freight_cost) / NULLIF(SUM(quantity), 0), 0) AS avg_cost
       FROM purchases WHERE perfume_id = $1`,
      [perfumeId],
    );
    const unitCost = Math.round(Number(costRows[0].avg_cost) * 100) / 100;
    const { rows } = await client.query(
      `INSERT INTO stock_losses (perfume_id, quantity, unit_cost, reason, note, occurred_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
       RETURNING id`,
      [perfumeId, quantity, unitCost, reason, note || null, occurredAt || null],
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

export async function listStockLosses() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT l.id, l.perfume_id, l.quantity, l.unit_cost, l.reason, l.note, l.occurred_at,
           f.name AS perfume_name, l.quantity * l.unit_cost AS total_cost
    FROM stock_losses l
    JOIN perfumes f ON f.id = l.perfume_id
    ORDER BY l.occurred_at DESC, l.id DESC
  `);
  return rows;
}

/** Elimina una pérdida registrada por error y devuelve las unidades al stock. */
export async function deleteStockLoss(id) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'DELETE FROM stock_losses WHERE id = $1 RETURNING perfume_id, quantity',
      [id],
    );
    if (rows[0]) {
      await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [
        rows[0].quantity,
        rows[0].perfume_id,
      ]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ---------- Caja: aportes de capital y retiros ----------

export const CASH_KINDS = ['aporte', 'retiro'];

export async function createCashMovement({ kind, amount, note, occurredAt, purpose }) {
  await ensureSchema();
  if (!CASH_KINDS.includes(kind)) throw new Error('Tipo de movimiento no válido.');
  const { rows } = await getPool().query(
    `INSERT INTO cash_movements (kind, amount, note, occurred_at, purpose)
     VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5)
     RETURNING id, kind, amount, note, purpose, occurred_at, created_at`,
    [kind, amount, note || null, occurredAt || null, purpose || null],
  );
  return rows[0];
}

export async function listCashMovements() {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, kind, amount, note, purpose, occurred_at, created_at
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
 * - Pandero: cuenta las cuotas a medida que se pagan (las de números ya
 *   entregados y las marcadas "Pagando" en la semana actual). El cobro de la
 *   venta que se crea al entregar el perfume NO se suma: es el mismo dinero de
 *   esas cuotas. Por eso se excluyen todos los cobros de ventas tipo pandero.
 * - Abonos de crédito: solo los de ventas a crédito.
 * - Compras y gastos se separan según con qué se pagaron (paid_with): lo
 *   pagado con capital no se resta de lo que entró; lo pagado con ganancias
 *   (reinversión) sí.
 */
export async function getCashFlow({ start = null, end = null } = {}) {
  await ensureSchema();
  const pool = getPool();
  const range = [start, end];
  const allTime = !start && !end;
  const includesNow = !end || end > new Date();

  const [contado, creditPayments, closedRounds, legacyCuotas, paying, purchases, expenses, commissions, movements, debtPaid, pfOut] =
    await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales
         WHERE payment_type = 'contado' AND ${inRange('created_at')}`,
        range,
      ),
      pool.query(
        `SELECT COALESCE(SUM(cp.amount), 0) AS total
         FROM credit_payments cp JOIN sales s ON s.id = cp.sale_id
         WHERE s.payment_type = 'credito' AND ${inRange('cp.paid_at')}`,
        range,
      ),
      pool.query(
        `SELECT COUNT(DISTINCT round_entry_id)::int AS count, COALESCE(SUM(amount), 0) AS total
         FROM pandero_round_payments WHERE ${inRange('created_at')}`,
        range,
      ),
      // Cuotas de números cerrados antes de existir el historial: no tienen fecha.
      allTime
        ? pool.query('SELECT COALESCE(SUM(cuotas_total), 0) AS total FROM pandero_groups')
        : Promise.resolve({ rows: [{ total: 0 }] }),
      // Cuotas marcadas "Pagando" en la semana actual: ya se cobraron.
      includesNow
        ? pool.query('SELECT COUNT(*)::int AS count FROM pandero_entries WHERE paying = true')
        : Promise.resolve({ rows: [{ count: 0 }] }),
      pool.query(
        `SELECT paid_with, COALESCE(SUM(quantity * unit_cost + freight_cost), 0) AS total FROM purchases
         WHERE ${inRange('created_at')} GROUP BY paid_with`,
        range,
      ),
      pool.query(
        `SELECT paid_with, COALESCE(SUM(amount), 0) AS total FROM expenses
         WHERE ${inRange('created_at')} GROUP BY paid_with`,
        range,
      ),
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
      // Pagos de deudas, separados igual que compras y gastos por con qué se pagaron.
      pool.query(
        `SELECT paid_with, COALESCE(SUM(amount), 0) AS total FROM debt_payments
         WHERE ${inRange('paid_at')} GROUP BY paid_with`,
        range,
      ),
      // Salidas anotadas a mano en el Reparto (impuestos, ahorro de ganancia y
      // pagos de deuda antiguos): es dinero que salió de la cuenta del negocio.
      pool.query(
        `SELECT category, COALESCE(SUM(amount), 0) AS total FROM pf_outflows
         WHERE ${inRange('occurred_at')} GROUP BY category`,
        range,
      ),
    ]);

  const byPaidWith = (result, source) =>
    Number(result.rows.find((r) => r.paid_with === source)?.total || 0);

  const contadoTotal = Number(contado.rows[0].total);
  const creditTotal = Number(creditPayments.rows[0].total);
  const panderoClosed = Number(closedRounds.rows[0].total) + Number(legacyCuotas.rows[0].total);
  const panderoThisWeek = paying.rows[0].count * PANDERO_CUOTA_AMOUNT;
  const capitalIn = Number(movements.rows.find((r) => r.kind === 'aporte')?.total || 0);
  const withdrawals = Number(movements.rows.find((r) => r.kind === 'retiro')?.total || 0);
  const purchasesCapital = byPaidWith(purchases, 'capital');
  const purchasesReinvested = byPaidWith(purchases, 'ganancias');
  const expensesCapital = byPaidWith(expenses, 'capital');
  const expensesFromEarnings = byPaidWith(expenses, 'ganancias');
  const commissionsPaid = Number(commissions.rows[0].total);
  const debtPaymentsCapital = byPaidWith(debtPaid, 'capital');
  const debtPaymentsFromEarnings = byPaidWith(debtPaid, 'ganancias');
  const pfOutflowsByCategory = Object.fromEntries(pfOut.rows.map((r) => [r.category, Number(r.total)]));
  const pfOutflows = pfOut.rows.reduce((sum, r) => sum + Number(r.total), 0);

  const incomeTotal = contadoTotal + creditTotal + panderoClosed + panderoThisWeek;
  // Lo que se pagó con capital sale de tu bolsillo, no de lo que entró.
  const earningsOut =
    purchasesReinvested +
    expensesFromEarnings +
    commissionsPaid +
    withdrawals +
    debtPaymentsFromEarnings +
    pfOutflows;

  return {
    contado: contadoTotal,
    contadoCount: contado.rows[0].count,
    creditPayments: creditTotal,
    panderoClosed,
    panderoClosedCount: closedRounds.rows[0].count,
    panderoThisWeek,
    incomeTotal,
    purchases: purchasesCapital + purchasesReinvested,
    purchasesCapital,
    purchasesReinvested,
    expenses: expensesCapital + expensesFromEarnings,
    expensesCapital,
    expensesFromEarnings,
    commissionsPaid,
    withdrawals,
    debtPayments: debtPaymentsCapital + debtPaymentsFromEarnings,
    debtPaymentsCapital,
    debtPaymentsFromEarnings,
    pfOutflows,
    pfOutflowsByCategory,
    earningsLeft: incomeTotal - earningsOut,
    capitalIn,
    capitalPut: purchasesCapital + expensesCapital + debtPaymentsCapital + capitalIn,
    // Dinero del negocio en mano: lo que queda de las ganancias más el
    // efectivo que aportaste y no se gastó en una compra o gasto con capital.
    net: incomeTotal - earningsOut + capitalIn,
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

// ---------- Reparto tipo "Profit First" ----------
// Lo que entra se reparte en categorías según porcentajes configurables. El
// reparto NO se guarda: se calcula sobre los mismos ingresos que ya muestran
// Caja y Resumen (getCashFlow), así que siempre coincide con ellos y se ajusta
// solo si editas o borras una venta o un abono.

const PF_SEED_DATE = '2000-01-01';

function limaToday() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' -> medianoche de Lima (UTC-5) como Date.
function limaMidnight(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5));
}

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export async function listPfPlans() {
  await ensureSchema();
  const pool = getPool();

  const { rows: existing } = await pool.query('SELECT 1 FROM pf_plans LIMIT 1');
  if (existing.length === 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(7301)');
      const { rows: again } = await client.query('SELECT 1 FROM pf_plans LIMIT 1');
      if (again.length === 0) {
        const { rows } = await client.query(
          'INSERT INTO pf_plans (effective_from) VALUES ($1::date) RETURNING id',
          [PF_SEED_DATE],
        );
        for (const category of PF_CATEGORY_KEYS) {
          await client.query(
            'INSERT INTO pf_plan_items (plan_id, category, percent) VALUES ($1, $2, $3)',
            [rows[0].id, category, PF_DEFAULT_PERCENTS[category]],
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const { rows } = await pool.query(
    `SELECT p.id, to_char(p.effective_from, 'YYYY-MM-DD') AS effective_from, i.category, i.percent
     FROM pf_plans p JOIN pf_plan_items i ON i.plan_id = p.id
     ORDER BY p.effective_from ASC, p.id ASC`,
  );
  const byPlan = new Map();
  for (const row of rows) {
    if (!byPlan.has(row.id)) {
      byPlan.set(row.id, { id: row.id, effectiveFrom: row.effective_from, percents: {} });
    }
    byPlan.get(row.id).percents[row.category] = Number(row.percent);
  }
  return Array.from(byPlan.values());
}

/** Guarda un juego de porcentajes. mode 'hoy': rige desde hoy y lo anterior se
 * queda como estaba. mode 'todo': reemplaza todo el historial. */
export async function savePfPlan({ percents, mode }) {
  await ensureSchema();
  for (const category of PF_CATEGORY_KEYS) {
    const value = percents[category];
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) {
      throw new Error('Cada porcentaje debe estar entre 0 y 100.');
    }
  }
  const sumCents = PF_CATEGORY_KEYS.reduce((sum, key) => sum + Math.round(percents[key] * 100), 0);
  if (sumCents !== 10000) {
    throw new Error('Los porcentajes deben sumar exactamente 100%.');
  }

  // Asegura que exista el plan inicial antes de agregar uno nuevo con fecha.
  await listPfPlans();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (mode === 'todo') await client.query('DELETE FROM pf_plans');

    const effectiveFrom = mode === 'todo' ? PF_SEED_DATE : limaToday();
    const { rows: same } = await client.query(
      'SELECT id FROM pf_plans WHERE effective_from = $1::date',
      [effectiveFrom],
    );
    let planId;
    if (same.length > 0) {
      planId = same[0].id;
      await client.query('DELETE FROM pf_plan_items WHERE plan_id = $1', [planId]);
    } else {
      const { rows } = await client.query(
        'INSERT INTO pf_plans (effective_from) VALUES ($1::date) RETURNING id',
        [effectiveFrom],
      );
      planId = rows[0].id;
    }
    for (const category of PF_CATEGORY_KEYS) {
      await client.query(
        'INSERT INTO pf_plan_items (plan_id, category, percent) VALUES ($1, $2, $3)',
        [planId, category, percents[category]],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getPfBase() {
  await ensureSchema();
  const { rows } = await getPool().query("SELECT value FROM settings WHERE key = 'pf_base'");
  return rows[0]?.value === 'bruto' ? 'bruto' : 'neto';
}

export async function setPfBase(base) {
  await ensureSchema();
  if (!['neto', 'bruto'].includes(base)) throw new Error('Base de reparto no válida.');
  await getPool().query(
    `INSERT INTO settings (key, value) VALUES ('pf_base', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [base],
  );
}

export async function createPfOutflow({ category, amount, note, occurredAt }) {
  await ensureSchema();
  if (!PF_MANUAL_OUTFLOW_CATEGORIES.includes(category)) {
    throw new Error('Esa categoría no lleva salidas manuales.');
  }
  const { rows } = await getPool().query(
    `INSERT INTO pf_outflows (category, amount, note, occurred_at)
     VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()))
     RETURNING id, category, amount, note, occurred_at`,
    [category, amount, note || null, occurredAt || null],
  );
  return rows[0];
}

export async function deletePfOutflow(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM pf_outflows WHERE id = $1', [id]);
}

export async function listPfOutflows({ start = null, end = null } = {}) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT id, category, amount, note, occurred_at FROM pf_outflows
     WHERE ${inRange('occurred_at')} ORDER BY occurred_at DESC, id DESC`,
    [start, end],
  );
  return rows;
}

function pickMax(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function pickMin(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function baseOf(flow, mode, extraIncome = 0) {
  const gross = flow.incomeTotal + extraIncome;
  return mode === 'neto' ? Math.max(gross - flow.purchasesReinvested, 0) : gross;
}

/**
 * Reparto de un período. Cada tramo de tiempo se reparte con los porcentajes
 * que regían en esa fecha; los ingresos salen de getCashFlow (misma definición
 * que Caja y Resumen). Los centavos de redondeo van a la última categoría para
 * que el reparto siempre sume la base exacta.
 */
export async function getProfitFirst({ period = 'mes' } = {}) {
  await ensureSchema();
  const { start, end } = periodRange(period);
  const [plans, mode] = await Promise.all([listPfPlans(), getPfBase()]);
  const isAllTime = !start && !end;

  const windows = plans
    .map((plan, index) => {
      const from = index === 0 ? null : limaMidnight(plan.effectiveFrom);
      const to = index + 1 < plans.length ? limaMidnight(plans[index + 1].effectiveFrom) : null;
      return { plan, start: pickMax(from, start), end: pickMin(to, end) };
    })
    .filter((window) => !(window.start && window.end && window.start >= window.end));

  // Las cuotas de pandero cerradas antes de existir el historial no tienen
  // fecha: getCashFlow solo las suma cuando el rango no tiene límites.
  const legacyMissing = isAllTime && windows.length > 1;
  const [flows, legacyRows] = await Promise.all([
    Promise.all(windows.map((window) => getCashFlow({ start: window.start, end: window.end }))),
    legacyMissing
      ? getPool().query('SELECT COALESCE(SUM(cuotas_total), 0) AS total FROM pandero_groups')
      : Promise.resolve({ rows: [{ total: 0 }] }),
  ]);
  const legacy = Number(legacyRows.rows[0].total);
  const totalFlow = windows.length === 1 ? flows[0] : await getCashFlow({ start, end });

  let gross = 0;
  let reinvested = 0;
  let baseTotal = 0;
  const raw = Object.fromEntries(PF_CATEGORY_KEYS.map((key) => [key, 0]));
  flows.forEach((flow, index) => {
    const extra = index === 0 ? legacy : 0;
    const base = baseOf(flow, mode, extra);
    gross += flow.incomeTotal + extra;
    reinvested += flow.purchasesReinvested;
    baseTotal += base;
    for (const key of PF_CATEGORY_KEYS) {
      raw[key] += (base * windows[index].plan.percents[key]) / 100;
    }
  });

  const allocated = {};
  let runningTotal = 0;
  PF_CATEGORY_KEYS.forEach((key, index) => {
    if (index < PF_CATEGORY_KEYS.length - 1) {
      allocated[key] = round2(raw[key]);
      runningTotal += allocated[key];
    } else {
      allocated[key] = round2(round2(baseTotal) - runningTotal);
    }
  });

  const { rows: manualRows } = await getPool().query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total FROM pf_outflows
     WHERE ${inRange('occurred_at')} GROUP BY category`,
    [start, end],
  );
  const manual = (key) => Number(manualRows.find((row) => row.category === key)?.total || 0);
  const auto = {
    sueldo: totalFlow.withdrawals,
    operativos: totalFlow.expensesFromEarnings + totalFlow.commissionsPaid,
    // Los pagos registrados en Pagos → Deudas (con ganancias) cuentan solos.
    deuda: totalFlow.debtPaymentsFromEarnings,
  };

  const currentPercents = plans[plans.length - 1].percents;
  const categories = PF_CATEGORIES.map((category) => {
    const outAuto = round2(auto[category.key] || 0);
    const outManual = round2(manual(category.key));
    const outflows = round2(outAuto + outManual);
    return {
      ...category,
      percent: currentPercents[category.key],
      allocated: allocated[category.key],
      outAuto,
      outManual,
      outflows,
      balance: round2(allocated[category.key] - outflows),
    };
  });

  const insights = await buildPfInsights({
    mode,
    period,
    gross,
    reinvested,
    categories,
    currentPercents,
    percentsChanged: windows.length > 1,
  });

  return {
    period,
    mode,
    gross: round2(gross),
    reinvested: round2(reinvested),
    base: round2(baseTotal),
    percentsChanged: windows.length > 1,
    categories,
    totals: {
      allocated: round2(categories.reduce((sum, c) => sum + c.allocated, 0)),
      outflows: round2(categories.reduce((sum, c) => sum + c.outflows, 0)),
      balance: round2(categories.reduce((sum, c) => sum + c.balance, 0)),
    },
    insights,
  };
}

// Avisos automáticos con reglas simples sobre tus propios números (no es IA).
async function buildPfInsights({ mode, gross, reinvested, categories, currentPercents, percentsChanged }) {
  const insights = [];
  const money = (value) => `S/ ${round2(value).toFixed(2)}`;
  const byKey = Object.fromEntries(categories.map((c) => [c.key, c]));

  if (mode === 'neto' && reinvested > gross && gross > 0) {
    insights.push({
      tone: 'warn',
      text: `Reinvertiste ${money(reinvested)} en perfumes y solo entraron ${money(gross)}: este período no queda nada para repartir.`,
    });
  }

  const sueldo = byKey.sueldo;
  if (sueldo.outflows > sueldo.allocated) {
    insights.push({
      tone: 'bad',
      text: `Retiraste ${money(sueldo.outflows)} para ti y tu sueldo acumulado es ${money(sueldo.allocated)} (${sueldo.percent}%): te pasaste por ${money(sueldo.outflows - sueldo.allocated)}.`,
    });
  } else if (sueldo.allocated > 0) {
    insights.push({
      tone: 'good',
      text: `Puedes retirar hasta ${money(sueldo.balance)} más para ti sin pasarte de tu sueldo.`,
    });
  }

  const operativos = byKey.operativos;
  if (operativos.outflows > operativos.allocated) {
    insights.push({
      tone: 'bad',
      text: `Tus gastos y comisiones (${money(operativos.outflows)}) superan lo reservado para gastos operativos (${money(operativos.allocated)}) por ${money(operativos.outflows - operativos.allocated)}.`,
    });
  }

  for (const key of ['impuestos', 'deuda']) {
    const category = byKey[key];
    if (category.balance > 0) {
      insights.push({
        tone: 'info',
        text: `${category.label}: tienes ${money(category.balance)} acumulados sin usar. ${key === 'impuestos' ? 'Apártalos en una cuenta aparte.' : 'Úsalos para abonar a tu deuda.'}`,
      });
    }
  }

  // Tendencia: cómo gastaste de verdad en los últimos 3 meses completos frente
  // a lo que reservas, para sugerir ajustar porcentajes.
  const limaNow = new Date(Date.now() - 5 * 3600 * 1000);
  const year = limaNow.getUTCFullYear();
  const month = limaNow.getUTCMonth();
  const monthFlows = await Promise.all(
    [1, 2, 3].map((back) =>
      getCashFlow({ start: limaMonthStart(year, month - back), end: limaMonthStart(year, month - back + 1) }),
    ),
  );
  const monthsBase = monthFlows.reduce((sum, flow) => sum + baseOf(flow, mode), 0);
  if (monthsBase > 0) {
    const realOperativos =
      (monthFlows.reduce((sum, f) => sum + f.expensesFromEarnings + f.commissionsPaid, 0) / monthsBase) * 100;
    const realSueldo = (monthFlows.reduce((sum, f) => sum + f.withdrawals, 0) / monthsBase) * 100;
    const compare = [
      ['operativos', realOperativos, 'gastos operativos'],
      ['sueldo', realSueldo, 'sueldo'],
    ];
    for (const [key, real, label] of compare) {
      const planned = currentPercents[key];
      if (real - planned >= 5) {
        insights.push({
          tone: 'warn',
          text: `En los últimos 3 meses tus ${label} reales fueron ${real.toFixed(0)}% de la base y reservas ${planned}%. Considera subir ese porcentaje o reducir esos gastos.`,
        });
      } else if (planned - real >= 5 && real > 0) {
        insights.push({
          tone: 'info',
          text: `En los últimos 3 meses usaste solo ${real.toFixed(0)}% en ${label} y reservas ${planned}%. Podrías bajarlo y subir tu ganancia.`,
        });
      }
    }
  }

  if (percentsChanged) {
    insights.push({
      tone: 'info',
      text: 'Los porcentajes cambiaron dentro de este período: cada ingreso se repartió con los que regían en su fecha.',
    });
  }

  return insights;
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
           s.commission_paid, s.delivered, s.created_at, f.name AS perfume_name,
           COALESCE(cp.paid, 0) AS paid_amount
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    LEFT JOIN (SELECT sale_id, SUM(amount) AS paid FROM credit_payments GROUP BY sale_id) cp
      ON cp.sale_id = s.id
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

  const [saleStats, costOfGoodsSold, creditPending, commissionPending, lowStock, pendingDeliveries, flow, panderoInProgress, losses] =
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
      pool.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_cost), 0) AS total
         FROM stock_losses WHERE ${inRange('occurred_at')}`,
        range,
      ),
    ]);

  const salesTotal = Number(saleStats.rows[0].total);
  // Costo con el costo promedio de compra de cada perfume (incluye flete). Un
  // perfume vendido sin ninguna compra registrada todavía no aporta costo.
  const estimatedCost = Number(costOfGoodsSold.rows[0].total);
  const commissionsEarned = Number(saleStats.rows[0].commissions);
  const salesProfit = salesTotal - estimatedCost - commissionsEarned;
  // Las pérdidas no son dinero nuevo que sale (se pagó al comprar), pero sí
  // reducen la ganancia: ese perfume ya no se va a vender.
  const lossesTotal = Number(losses.rows[0].total);

  return {
    role,
    period,
    flow,
    salesCount: saleStats.rows[0].count,
    salesTotal,
    estimatedCost,
    commissionsEarned,
    salesProfit,
    lossesTotal,
    lossesCount: losses.rows[0].count,
    profit: salesProfit - lossesTotal,
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
export async function receiveOrdersToStock(lines, paidWith) {
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
        `INSERT INTO purchases (perfume_id, quantity, unit_cost, freight_cost, note, paid_with)
         VALUES ($1, $2, $3, 0, $4, $5)`,
        [order.perfume_id, order.quantity, line.unitCost, note, paidWith],
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

/**
 * Vuelve a vincular con el catálogo los precios de proveedor que quedaron
 * "Sin catálogo" porque, al pegarlos, el perfume todavía no existía (o tenía
 * otro nombre). Solo acepta nombres iguales una vez normalizados (sin
 * mayúsculas, ml, EDP ni espacios): nunca une por parecido, para no mezclar
 * variantes como "Eclaire" y "Eclaire Banofi". Si ese proveedor ya tenía un
 * precio vinculado en el mismo nivel, el suelto sobra y se borra.
 */
export async function relinkSupplierPrices() {
  await ensureSchema();
  const pool = getPool();
  const { rows: unlinked } = await pool.query(
    'SELECT id, supplier_id, product_name, tier_label FROM supplier_prices WHERE perfume_id IS NULL',
  );
  if (unlinked.length === 0) return 0;

  const tight = (text) => normalizeProductName(text).replace(/\s+/g, '');
  const { rows: perfumes } = await pool.query('SELECT id, name FROM perfumes');
  const byName = new Map();
  const byInfoKey = new Map();
  for (const perfume of perfumes) {
    const key = tight(perfume.name);
    // Dos perfumes con el mismo nombre normalizado: ambiguo, no se vincula.
    byName.set(key, byName.has(key) ? null : perfume.id);
    const infoKey = perfumeInfoKey(perfume.name);
    byInfoKey.set(infoKey, byInfoKey.has(infoKey) ? null : perfume.id);
  }
  // Mismo perfume escrito distinto (ver NAME_ALIASES), ej. "Eclaire Banofi" = "Eclaire Bonoffi".
  const aliasMatch = (name) => {
    const target = NAME_ALIASES.get(perfumeInfoKey(name));
    return target ? byInfoKey.get(target) : undefined;
  };

  let linked = 0;
  for (const row of unlinked) {
    const perfumeId = byName.get(tight(row.product_name)) || aliasMatch(row.product_name);
    if (!perfumeId) continue;
    const { rows: existing } = await pool.query(
      'SELECT id FROM supplier_prices WHERE supplier_id = $1 AND perfume_id = $2 AND tier_label = $3',
      [row.supplier_id, perfumeId, row.tier_label],
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM supplier_prices WHERE id = $1', [row.id]);
    } else {
      await pool.query('UPDATE supplier_prices SET perfume_id = $1 WHERE id = $2', [perfumeId, row.id]);
    }
    linked += 1;
  }
  return linked;
}

/** Proveedores con cuántos productos y niveles de precio tienen cargados. */
export async function listSupplierSummaries() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.name, s.note,
           COUNT(DISTINCT COALESCE(sp.perfume_id::text, lower(sp.product_name)))::int AS product_count,
           COUNT(DISTINCT sp.tier_label)::int AS tier_count
    FROM suppliers s
    LEFT JOIN supplier_prices sp ON sp.supplier_id = s.id
    GROUP BY s.id
    ORDER BY s.name ASC
  `);
  return rows;
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

/**
 * Agrega al catálogo, de una vez, los perfumes que tus proveedores ofrecen y
 * que todavía no tienes. Precio de venta = mejor precio por mayor entre los
 * proveedores (ver lib/supplier-pricing.js) + `margin`. Se crean sin imagen:
 * la tienda no los muestra hasta que les subas su foto.
 * Con `updateExisting`, también recalcula el precio de los que ya están en el
 * catálogo con la misma regla. Todo en una sola transacción.
 */
export async function addMissingSupplierProductsToCatalog({ margin, updateExisting = false }) {
  await ensureSchema();
  const [comparison, { rows: currentPrices }] = await Promise.all([
    listPriceComparison(),
    getPool().query('SELECT id, price FROM perfumes'),
  ]);
  const priceById = new Map(currentPrices.map((p) => [p.id, Number(p.price)]));
  const toCreate = [];
  const toUpdate = [];
  const toComplete = [];
  for (const row of comparison) {
    const best = bestWholesaleOption(row.options, 'mayor');
    if (!best) continue;
    const price = salePrice(best.price, margin);
    // Ficha del perfume (categoría, marca, notas, descripción) si se conoce.
    const info = findPerfumeInfo(row.perfumeName) || {};
    if (row.unlinked) {
      toCreate.push({ name: catalogName(row.perfumeName), price, info });
    } else {
      if (updateExisting && priceById.get(row.perfumeId) !== price) toUpdate.push({ id: row.perfumeId, price });
      if (info.brand) toComplete.push({ id: row.perfumeId, info });
    }
  }

  const client = await getPool().connect();
  let completed = 0;
  try {
    await client.query('BEGIN');
    for (const { name, price, info } of toCreate) {
      await client.query(
        `INSERT INTO perfumes (name, price, image_url, category, brand, notes, description)
         VALUES ($1, $2, '', $3, $4, $5, $6)`,
        [name, price, info.category || null, info.brand || null, info.notes || null, info.description || null],
      );
    }
    for (const item of toUpdate) {
      await client.query('UPDATE perfumes SET price = $1 WHERE id = $2', [item.price, item.id]);
    }
    // A los que ya estaban en el catálogo solo se les completan los datos vacíos:
    // nunca se reemplaza lo que escribiste a mano.
    for (const { id, info } of toComplete) {
      const { rowCount } = await client.query(
        `UPDATE perfumes
         SET category = COALESCE(NULLIF(category, ''), $2),
             brand = COALESCE(NULLIF(brand, ''), $3),
             notes = COALESCE(NULLIF(notes, ''), $4),
             description = COALESCE(NULLIF(description, ''), $5)
         WHERE id = $1
           AND ((COALESCE(category, '') = '' AND $2::text IS NOT NULL)
             OR (COALESCE(brand, '') = '' AND $3::text IS NOT NULL)
             OR (COALESCE(notes, '') = '' AND $4::text IS NOT NULL)
             OR (COALESCE(description, '') = '' AND $5::text IS NOT NULL))`,
        [id, info.category || null, info.brand || null, info.notes || null, info.description || null],
      );
      completed += rowCount;
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Los precios de proveedor que estaban "Sin catálogo" quedan unidos a los
  // perfumes recién creados (mismo nombre).
  await relinkSupplierPrices();
  return {
    created: toCreate.length,
    updated: toUpdate.length,
    completed,
    withoutInfo: toCreate.filter((item) => !item.info.notes).map((item) => item.name),
  };
}

// ---------- Deudas (con saldo) ----------

/** Deudas con lo pagado, el saldo y su historial de pagos. Primero las que tienen saldo. */
export async function listDebts() {
  await ensureSchema();
  const pool = getPool();
  const [{ rows: debts }, { rows: payments }] = await Promise.all([
    pool.query(`
      SELECT d.id, d.creditor, d.description, d.total, d.due_date, d.created_at,
             COALESCE(SUM(p.amount), 0) AS paid
      FROM debts d LEFT JOIN debt_payments p ON p.debt_id = d.id
      GROUP BY d.id
    `),
    pool.query(
      'SELECT id, debt_id, amount, paid_with, note, paid_at FROM debt_payments ORDER BY paid_at DESC, id DESC',
    ),
  ]);
  return debts
    .map((debt) => {
      const total = Number(debt.total);
      const paid = Math.round(Number(debt.paid) * 100) / 100;
      return {
        ...debt,
        total,
        paid,
        balance: Math.max(Math.round((total - paid) * 100) / 100, 0),
        payments: payments.filter((p) => p.debt_id === debt.id),
      };
    })
    .sort((a, b) => Number(b.balance > 0) - Number(a.balance > 0) || new Date(b.created_at) - new Date(a.created_at));
}

export async function createDebt({ creditor, description, total, dueDate }) {
  await ensureSchema();
  await getPool().query(
    'INSERT INTO debts (creditor, description, total, due_date) VALUES ($1, $2, $3, $4)',
    [creditor, description || null, total, dueDate || null],
  );
}

export async function updateDebt(id, { creditor, description, total, dueDate }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM debt_payments WHERE debt_id = $1',
    [id],
  );
  if (total < Number(rows[0].paid)) {
    throw new Error(`El total no puede ser menor a lo que ya pagaste (S/ ${Number(rows[0].paid).toFixed(2)}).`);
  }
  await getPool().query(
    'UPDATE debts SET creditor = $1, description = $2, total = $3, due_date = $4 WHERE id = $5',
    [creditor, description || null, total, dueDate || null, id],
  );
}

/** Borra la deuda y sus pagos (dejan de contar como salida de dinero). */
export async function deleteDebt(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM debts WHERE id = $1', [id]);
}

export async function addDebtPayment({ debtId, amount, paidWith, note, paidAt }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Bloquea la deuda para que dos pagos a la vez no superen el saldo.
    const { rows } = await client.query('SELECT total FROM debts WHERE id = $1 FOR UPDATE', [debtId]);
    if (!rows[0]) throw new Error('La deuda no existe.');
    const { rows: paidRows } = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid FROM debt_payments WHERE debt_id = $1',
      [debtId],
    );
    const balance = Math.round((Number(rows[0].total) - Number(paidRows[0].paid)) * 100) / 100;
    if (amount > balance) {
      throw new Error(`El pago no puede ser mayor al saldo (S/ ${balance.toFixed(2)}).`);
    }
    await client.query(
      `INSERT INTO debt_payments (debt_id, amount, paid_with, note, paid_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()))`,
      [debtId, amount, paidWith, note || null, paidAt || null],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteDebtPayment(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM debt_payments WHERE id = $1', [id]);
}

/**
 * Paga de una vez a la vendedora toda la comisión ya disponible (la de ventas
 * que el cliente ya pagó). Usa la misma regla que el botón de cada venta en
 * Comisiones. Devuelve cuánto se pagó en total.
 */
export async function payAllAvailableCommissions() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id
    FROM sales s
    LEFT JOIN (SELECT sale_id, SUM(amount) AS paid FROM credit_payments GROUP BY sale_id) cp ON cp.sale_id = s.id
    WHERE s.commission_amount IS NOT NULL
      AND ROUND(
            CASE WHEN s.payment_type = 'contado' OR s.quantity * s.unit_price <= 0
              THEN s.commission_amount
              ELSE s.commission_amount * LEAST(COALESCE(cp.paid, 0) / (s.quantity * s.unit_price), 1)
            END, 2) > s.commission_paid_amount + 0.004
  `);
  let total = 0;
  for (const { id } of rows) {
    const before = await getPool().query('SELECT commission_paid_amount FROM sales WHERE id = $1', [id]);
    const after = await payAvailableCommission(id);
    total += Number(after.commission_paid_amount) - Number(before.rows[0].commission_paid_amount);
  }
  return Math.round(total * 100) / 100;
}

// ---------- Venta rápida (varios perfumes en una sola venta) ----------

/**
 * Registra una venta de uno o varios perfumes en una sola transacción: si
 * falta stock de alguno, no se guarda nada. Cada perfume queda como una venta
 * (así funcionan stock, comisiones y Por cobrar). Si es a crédito y el cliente
 * dejó algo a cuenta, el abono se reparte en orden entre los perfumes.
 */
export async function createSalesBatch({
  items,
  paymentType,
  customerName,
  soldByRole,
  soldByName,
  delivered,
  initialPayment = 0,
}) {
  await ensureSchema();
  const percent = soldByRole === 'vendedora' ? await getCommissionPercent() : null;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const saleIds = [];
    let remaining = paymentType === 'credito' ? Math.max(Number(initialPayment) || 0, 0) : 0;
    for (const item of items) {
      const { rows: perfumeRows } = await client.query(
        'SELECT name, stock FROM perfumes WHERE id = $1 FOR UPDATE',
        [item.perfumeId],
      );
      const perfume = perfumeRows[0];
      if (!perfume) throw new Error('Uno de los perfumes ya no existe.');
      if (perfume.stock < item.quantity) {
        throw new Error(
          `No hay suficiente stock de ${perfume.name} (tienes ${perfume.stock}). Registra la compra primero.`,
        );
      }
      const total = Math.round(item.quantity * item.unitPrice * 100) / 100;
      const commissionAmount = percent == null ? null : Math.round(total * percent) / 100;
      const { rows } = await client.query(
        `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role, sold_by_name, delivered, commission_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          item.perfumeId,
          item.quantity,
          item.unitPrice,
          paymentType,
          customerName || null,
          soldByRole,
          soldByName || null,
          delivered,
          commissionAmount,
        ],
      );
      await client.query('UPDATE perfumes SET stock = stock - $1 WHERE id = $2', [item.quantity, item.perfumeId]);
      saleIds.push(rows[0].id);

      if (remaining > 0) {
        const applied = Math.min(remaining, total);
        await client.query(
          `INSERT INTO credit_payments (sale_id, amount, note) VALUES ($1, $2, 'A cuenta al vender')`,
          [rows[0].id, applied],
        );
        remaining = Math.round((remaining - applied) * 100) / 100;
      }
    }
    if (remaining > 0) throw new Error('Lo que dejó a cuenta es más que el total de la venta.');
    await client.query('COMMIT');
    return saleIds;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Nombres de clientes usados antes (para sugerirlos al vender). */
export async function listCustomerNames(limit = 300) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT customer_name AS name, MAX(created_at) AS last
     FROM sales WHERE COALESCE(customer_name, '') <> '' AND customer_name NOT LIKE '%(web %'
     GROUP BY customer_name ORDER BY last DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => r.name);
}
