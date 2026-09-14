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
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by_name TEXT;

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

      CREATE TABLE IF NOT EXISTS pandero_entries (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES pandero_groups(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        perfume_id INTEGER NOT NULL REFERENCES perfumes(id),
        fulfilled BOOLEAN NOT NULL DEFAULT false,
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
           s.payment_type, s.customer_name, s.sold_by_role, s.sold_by_name, s.commission_amount,
           s.commission_paid, s.delivered, s.created_at, f.name AS perfume_name
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
            s.payment_type, s.customer_name, s.sold_by_role, s.sold_by_name, s.commission_amount,
            s.commission_paid, s.delivered, s.created_at, f.name AS perfume_name,
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
  return rows;
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

export async function setCommissionPaid(saleId, paid) {
  await ensureSchema();

  if (paid) {
    // La comisión de una venta a crédito/pandero solo se puede pagar cuando
    // el cliente terminó de pagarla por completo (sin importar si el cobro
    // se completó en un solo mes o se juntó en varios abonos a lo largo de
    // varios fines de mes).
    const { rows: saleRows } = await getPool().query(
      `SELECT s.payment_type, (s.quantity * s.unit_price) AS total, COALESCE(SUM(cp.amount), 0) AS paid_amount
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
    const fullyCollected =
      sale.payment_type === 'contado' || Number(sale.paid_amount) >= Number(sale.total);
    if (!fullyCollected) {
      const balance = Number(sale.total) - Number(sale.paid_amount);
      throw new Error(
        `No puedes pagar esta comisión todavía: el cliente aún debe S/ ${balance.toFixed(2)} de esta venta.`,
      );
    }
  }

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
    costOfGoodsSold,
    totalInvested,
    potentialIfSoldOut,
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
      pool.query(`
        SELECT COALESCE(SUM(s.quantity * pc.avg_unit_cost), 0) AS total
        FROM sales s
        JOIN (
          SELECT perfume_id, SUM(quantity * unit_cost + freight_cost) / SUM(quantity) AS avg_unit_cost
          FROM purchases
          GROUP BY perfume_id
        ) pc ON pc.perfume_id = s.perfume_id
      `),
      pool.query(
        `SELECT COALESCE(SUM(quantity * unit_cost + freight_cost), 0) AS total FROM purchases`,
      ),
      pool.query(`
        SELECT
          COALESCE(SUM(f.stock * f.price), 0) AS revenue,
          COALESCE(SUM(f.stock * pc.avg_unit_cost), 0) AS cost
        FROM perfumes f
        LEFT JOIN (
          SELECT perfume_id, SUM(quantity * unit_cost + freight_cost) / SUM(quantity) AS avg_unit_cost
          FROM purchases
          GROUP BY perfume_id
        ) pc ON pc.perfume_id = f.id
      `),
    ]);

  const contado = byPaymentType.rows.find((row) => row.payment_type === 'contado');
  const credito = byPaymentType.rows.find((row) => row.payment_type === 'credito');
  const pandero = byPaymentType.rows.find((row) => row.payment_type === 'pandero');

  const salesTotal = Number(saleStats.rows[0].total);
  const contadoTotal = Number(contado?.total || 0);
  const creditPaidTotal = Number(creditPaid.rows[0].total);
  // Costo estimado con costo promedio por perfume (compras con costo + flete
  // repartidas entre todas las unidades). Los perfumes vendidos sin ninguna
  // compra registrada todavía no aportan costo (avg_unit_cost inexistente),
  // así que la ganancia de esas ventas puede verse inflada hasta que se
  // registre su compra.
  const estimatedCost = Number(costOfGoodsSold.rows[0].total);
  const grossProfit = salesTotal - estimatedCost;

  // Si vendieras hoy todo el stock que tienes en mano, al precio de venta
  // actual de cada perfume, usando el mismo costo promedio de compra.
  const potentialRevenue = Number(potentialIfSoldOut.rows[0].revenue);
  const potentialCost = Number(potentialIfSoldOut.rows[0].cost);
  const potentialProfit = potentialRevenue - potentialCost;

  return {
    role,
    perfumesCount: perfumeStats.rows[0].count,
    stockTotal: perfumeStats.rows[0].stock,
    salesCount: saleStats.rows[0].count,
    salesTotal,
    collectedTotal: contadoTotal + creditPaidTotal,
    creditPending: Number(creditTotal.rows[0].total) - creditPaidTotal,
    commissionPending: commissionPending.rows[0].total,
    contadoCount: contado?.count || 0,
    contadoTotal,
    creditoCount: credito?.count || 0,
    creditoTotal: credito?.total || 0,
    panderoCount: pandero?.count || 0,
    panderoTotal: pandero?.total || 0,
    pendingDeliveriesCount: pendingDeliveries.rows[0].count,
    estimatedCost,
    grossProfit,
    profitMarginPct: salesTotal > 0 ? (grossProfit / salesTotal) * 100 : 0,
    totalInvested: Number(totalInvested.rows[0].total),
    potentialRevenue,
    potentialCost,
    potentialProfit,
    stockByPerfume: stockByPerfume.rows,
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

export async function createOrder({ perfumeId, customerName, quantity, note }) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO orders (perfume_id, customer_name, quantity, note)
     VALUES ($1, $2, $3, $4)
     RETURNING id, perfume_id, customer_name, quantity, note, fulfilled, created_at`,
    [perfumeId, customerName, quantity, note || null],
  );
  return rows[0];
}

export async function listOrders() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT o.id, o.perfume_id, o.customer_name, o.quantity, o.note, o.fulfilled, o.created_at,
           f.name AS perfume_name, f.stock AS perfume_stock
    FROM orders o
    JOIN perfumes f ON f.id = o.perfume_id
    ORDER BY o.fulfilled ASC, o.created_at ASC
  `);
  return rows;
}

/** Por cada perfume con pedidos pendientes, cuánto se pidió en total, cuánto
 * stock hay ahora, y cuánto falta comprar para cubrir todos esos pedidos. */
export async function listOrderShortfalls() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT f.id AS perfume_id, f.name AS perfume_name, f.stock AS perfume_stock,
           SUM(o.quantity)::int AS ordered_quantity,
           GREATEST(SUM(o.quantity) - f.stock, 0)::int AS shortfall
    FROM orders o
    JOIN perfumes f ON f.id = o.perfume_id
    WHERE o.fulfilled = false
    GROUP BY f.id, f.name, f.stock
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

export async function setPanderoEntryFulfilled(id, fulfilled) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'UPDATE pandero_entries SET fulfilled = $1 WHERE id = $2 RETURNING id, fulfilled',
    [fulfilled, id],
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
    SELECT e.id, e.group_id, e.position, e.customer_name, e.fulfilled, e.created_at,
           f.name AS perfume_name,
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
