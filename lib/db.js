import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Falta configurar DATABASE_URL en las variables de entorno.');
    }
    pool = new Pool({ connectionString });
    attachDatabasePool(pool);
  }
  return pool;
}

function ensureSchema() {
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

      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        quantity INTEGER NOT NULL,
        unit_cost NUMERIC(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

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

      CREATE TABLE IF NOT EXISTS credit_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
        amount NUMERIC(10,2) NOT NULL,
        note TEXT,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  return schemaReady;
}

// ---------- Perfumes ----------

export async function listPerfumes() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT id, name, price, image_url, video_url, description, stock, created_at FROM perfumes ORDER BY created_at DESC',
  );
  return rows;
}

export async function createPerfume({ name, price, imageUrl, videoUrl, description }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO perfumes (name, price, image_url, video_url, description)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, price, image_url, video_url, description, stock, created_at`,
    [name, price, imageUrl, videoUrl || null, description || null],
  );
  return rows[0];
}

export async function updatePerfume(id, { name, price, imageUrl, videoUrl, description }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE perfumes
     SET name = $1, price = $2, image_url = $3, video_url = $4, description = $5
     WHERE id = $6
     RETURNING id, name, price, image_url, video_url, description, stock, created_at`,
    [name, price, imageUrl, videoUrl || null, description || null, id],
  );
  return rows[0];
}

export async function deletePerfume(id) {
  await ensureSchema();
  await getPool().query('DELETE FROM perfumes WHERE id = $1', [id]);
}

// ---------- Compras ----------

export async function createPurchase({ perfumeId, quantity, unitCost, note }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO purchases (perfume_id, quantity, unit_cost, note)
       VALUES ($1, $2, $3, $4)
       RETURNING id, perfume_id, quantity, unit_cost, note, created_at`,
      [perfumeId, quantity, unitCost, note || null],
    );
    await client.query('UPDATE perfumes SET stock = stock + $1 WHERE id = $2', [quantity, perfumeId]);
    await client.query('COMMIT');
    return rows[0];
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
    SELECT p.id, p.perfume_id, p.quantity, p.unit_cost, p.note, p.created_at, f.name AS perfume_name
    FROM purchases p
    JOIN perfumes f ON f.id = p.perfume_id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

// ---------- Ventas ----------

export async function createSale({ perfumeId, quantity, unitPrice, paymentType, customerName, soldByRole }) {
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

    const { rows } = await client.query(
      `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role,
                 commission_amount, commission_paid, created_at`,
      [perfumeId, quantity, unitPrice, paymentType, customerName || null, soldByRole],
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

export async function listSales() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.perfume_id, s.quantity, s.unit_price, (s.quantity * s.unit_price) AS total,
           s.payment_type, s.customer_name, s.sold_by_role, s.commission_amount, s.commission_paid,
           s.created_at, f.name AS perfume_name
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    ORDER BY s.created_at DESC
  `);
  return rows;
}

export async function listSalesBySeller(role) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT s.id, s.perfume_id, s.quantity, s.unit_price, (s.quantity * s.unit_price) AS total,
            s.payment_type, s.customer_name, s.sold_by_role, s.commission_amount, s.commission_paid,
            s.created_at, f.name AS perfume_name
     FROM sales s
     JOIN perfumes f ON f.id = s.perfume_id
     WHERE s.sold_by_role = $1
     ORDER BY s.created_at DESC`,
    [role],
  );
  return rows;
}

export async function setCommission(saleId, amount) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE sales SET commission_amount = $1 WHERE id = $2
     RETURNING id, commission_amount, commission_paid`,
    [amount, saleId],
  );
  return rows[0];
}

export async function setCommissionPaid(saleId, paid) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `UPDATE sales SET commission_paid = $1 WHERE id = $2
     RETURNING id, commission_amount, commission_paid`,
    [paid, saleId],
  );
  return rows[0];
}

// ---------- Crédito / pandero ----------

export async function listCreditSales() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.perfume_id, s.quantity, s.unit_price, s.customer_name, s.sold_by_role, s.created_at,
           f.name AS perfume_name,
           (s.quantity * s.unit_price) AS total,
           COALESCE(SUM(cp.amount), 0) AS paid_amount,
           (s.quantity * s.unit_price) - COALESCE(SUM(cp.amount), 0) AS balance
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    LEFT JOIN credit_payments cp ON cp.sale_id = s.id
    WHERE s.payment_type = 'credito'
    GROUP BY s.id, f.name
    ORDER BY s.created_at DESC
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
       WHERE s.id = $1 AND s.payment_type = 'credito'
       GROUP BY s.id`,
      [saleId],
    );
    if (saleRows.length === 0) {
      throw new Error('La venta a crédito no existe.');
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

export async function getSummary(role) {
  await ensureSchema();
  const pool = getPool();

  if (role === 'vendedora') {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS sales_count,
        COALESCE(SUM(quantity * unit_price), 0) AS sales_total,
        COALESCE(SUM(commission_amount) FILTER (WHERE commission_paid = false), 0) AS commission_pending,
        COALESCE(SUM(commission_amount) FILTER (WHERE commission_paid = true), 0) AS commission_paid_total
      FROM sales WHERE sold_by_role = 'vendedora'
    `);
    return {
      role,
      salesCount: rows[0].sales_count,
      salesTotal: rows[0].sales_total,
      commissionPending: rows[0].commission_pending,
      commissionPaidTotal: rows[0].commission_paid_total,
    };
  }

  const [perfumeStats, saleStats, creditTotal, creditPaid, commissionPending] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(stock), 0)::int AS stock FROM perfumes'),
    pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales'),
    pool.query(`SELECT COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales WHERE payment_type = 'credito'`),
    pool.query(`
      SELECT COALESCE(SUM(cp.amount), 0) AS total
      FROM credit_payments cp
      JOIN sales s ON s.id = cp.sale_id
      WHERE s.payment_type = 'credito'
    `),
    pool.query(
      `SELECT COALESCE(SUM(commission_amount) FILTER (WHERE commission_paid = false), 0) AS total FROM sales`,
    ),
  ]);

  return {
    role,
    perfumesCount: perfumeStats.rows[0].count,
    stockTotal: perfumeStats.rows[0].stock,
    salesCount: saleStats.rows[0].count,
    salesTotal: saleStats.rows[0].total,
    creditPending: Number(creditTotal.rows[0].total) - Number(creditPaid.rows[0].total),
    commissionPending: commissionPending.rows[0].total,
  };
}
