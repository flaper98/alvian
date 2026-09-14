import { Pool } from 'pg';

let pool;
let schemaReady;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Falta configurar DATABASE_URL en las variables de entorno.');
    }
    pool = new Pool({ connectionString });
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

// ---------- Ventas ----------

export async function createSale({
  perfumeId,
  quantity,
  unitPrice,
  paymentType,
  customerName,
  soldByRole,
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

    const { rows } = await client.query(
      `INSERT INTO sales (perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role, delivered)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role,
                 commission_amount, commission_paid, delivered, created_at`,
      [perfumeId, quantity, unitPrice, paymentType, customerName || null, soldByRole, delivered],
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
           s.sold_by_role, s.created_at,
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

export async function updateSale(id, { quantity, unitPrice, paymentType, customerName, soldByRole }) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: existingRows } = await client.query(
      'SELECT perfume_id, quantity, unit_price, payment_type FROM sales WHERE id = $1 FOR UPDATE',
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

    if (financialsChanged) {
      const { rows: paymentRows } = await client.query(
        'SELECT COUNT(*)::int AS count FROM credit_payments WHERE sale_id = $1',
        [id],
      );
      if (paymentRows[0].count > 0) {
        throw new Error(
          'No puedes cambiar cantidad, precio o forma de pago: esta venta ya tiene abonos registrados.',
        );
      }
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

    const { rows } = await client.query(
      `UPDATE sales
       SET quantity = $1, unit_price = $2, payment_type = $3, customer_name = $4, sold_by_role = $5
       WHERE id = $6
       RETURNING id, perfume_id, quantity, unit_price, payment_type, customer_name, sold_by_role,
                 commission_amount, commission_paid, delivered, created_at`,
      [quantity, unitPrice, paymentType, customerName || null, soldByRole, id],
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

export async function deleteSale(id) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const { rows: paymentRows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM credit_payments WHERE sale_id = $1',
      [id],
    );
    if (paymentRows[0].count > 0) {
      throw new Error('No puedes eliminar esta venta: ya tiene abonos de crédito registrados.');
    }

    const { rows: saleRows } = await client.query(
      'SELECT perfume_id, quantity FROM sales WHERE id = $1',
      [id],
    );
    if (saleRows.length === 0) {
      throw new Error('La venta no existe.');
    }

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
           s.payment_type, s.customer_name, s.sold_by_role, s.commission_amount, s.commission_paid,
           s.delivered, s.created_at, f.name AS perfume_name
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
            s.delivered, s.created_at, f.name AS perfume_name
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

  const [
    perfumeStats,
    saleStats,
    creditTotal,
    creditPaid,
    commissionPending,
    byPaymentType,
    stockByPerfume,
    pendingDeliveries,
  ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(stock), 0)::int AS stock FROM perfumes'),
      pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales'),
      pool.query(
        `SELECT COALESCE(SUM(quantity * unit_price), 0) AS total FROM sales WHERE payment_type IN ('credito', 'pandero')`,
      ),
      pool.query(`
        SELECT COALESCE(SUM(cp.amount), 0) AS total
        FROM credit_payments cp
        JOIN sales s ON s.id = cp.sale_id
        WHERE s.payment_type IN ('credito', 'pandero')
      `),
      pool.query(
        `SELECT COALESCE(SUM(commission_amount) FILTER (WHERE commission_paid = false), 0) AS total FROM sales`,
      ),
      pool.query(
        `SELECT payment_type, COUNT(*)::int AS count, COALESCE(SUM(quantity * unit_price), 0) AS total
         FROM sales GROUP BY payment_type`,
      ),
      pool.query('SELECT id, name, stock FROM perfumes ORDER BY stock ASC, name ASC LIMIT 8'),
      pool.query(`SELECT COUNT(*)::int AS count FROM sales WHERE delivered = false`),
    ]);

  const contado = byPaymentType.rows.find((row) => row.payment_type === 'contado');
  const credito = byPaymentType.rows.find((row) => row.payment_type === 'credito');
  const pandero = byPaymentType.rows.find((row) => row.payment_type === 'pandero');

  return {
    role,
    perfumesCount: perfumeStats.rows[0].count,
    stockTotal: perfumeStats.rows[0].stock,
    salesCount: saleStats.rows[0].count,
    salesTotal: saleStats.rows[0].total,
    creditPending: Number(creditTotal.rows[0].total) - Number(creditPaid.rows[0].total),
    commissionPending: commissionPending.rows[0].total,
    contadoCount: contado?.count || 0,
    contadoTotal: contado?.total || 0,
    creditoCount: credito?.count || 0,
    creditoTotal: credito?.total || 0,
    panderoCount: pandero?.count || 0,
    panderoTotal: pandero?.total || 0,
    pendingDeliveriesCount: pendingDeliveries.rows[0].count,
    stockByPerfume: stockByPerfume.rows,
  };
}
