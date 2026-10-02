import { getPool, ensureSchema, getCashFlow } from './db';

// ---------- Rango de fechas (hora de Lima, UTC-5 sin horario de verano) ----------

const LIMA_OFFSET_MS = 5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export const REPORT_PRESETS = {
  mes: 'Este mes',
  'mes-pasado': 'Mes pasado',
  '3-meses': 'Últimos 3 meses',
  anio: 'Este año',
  todo: 'Todo',
};

/** Medianoche de Lima de ese día, como instante UTC. Acepta meses/días fuera de rango. */
function limaMidnight(year, month, day) {
  return new Date(Date.UTC(year, month, day) + LIMA_OFFSET_MS);
}

function limaParts(date) {
  const lima = new Date(date.getTime() - LIMA_OFFSET_MS);
  return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate() };
}

/** "2026-09-30" → { y, m, d } o null si no es una fecha válida. */
function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const check = new Date(Date.UTC(y, m, d));
  if (check.getUTCMonth() !== m || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

export function toDayString(date) {
  const { y, m, d } = limaParts(date);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Convierte los parámetros de la URL en un rango { start, end } (end exclusivo).
 * `desde`/`hasta` (YYYY-MM-DD) tienen prioridad sobre el preset.
 */
export function resolveReportRange({ periodo, desde, hasta } = {}) {
  const from = parseDay(desde);
  const to = parseDay(hasta);
  if (from || to) {
    let start = from ? limaMidnight(from.y, from.m, from.d) : null;
    let end = to ? limaMidnight(to.y, to.m, to.d + 1) : null;
    if (start && end && start >= end) [start, end] = [limaMidnight(to.y, to.m, to.d), limaMidnight(from.y, from.m, from.d + 1)];
    return { preset: 'custom', start, end };
  }

  const { y, m } = limaParts(new Date());
  const preset = REPORT_PRESETS[periodo] ? periodo : 'mes';
  const ranges = {
    mes: [limaMidnight(y, m, 1), limaMidnight(y, m + 1, 1)],
    'mes-pasado': [limaMidnight(y, m - 1, 1), limaMidnight(y, m, 1)],
    '3-meses': [limaMidnight(y, m - 2, 1), limaMidnight(y, m + 1, 1)],
    anio: [limaMidnight(y, 0, 1), limaMidnight(y + 1, 0, 1)],
    todo: [null, null],
  };
  const [start, end] = ranges[preset];
  return { preset, start, end };
}

/** Día a día si el rango es corto; mes a mes si es largo o abierto. */
function granularityFor({ start, end }) {
  if (start && end && end - start <= 62 * DAY_MS) return 'day';
  return 'month';
}

// Filtro de fecha reutilizable: $1 = inicio (o null), $2 = fin (o null).
function inRange(column) {
  return `($1::timestamptz IS NULL OR ${column} >= $1) AND ($2::timestamptz IS NULL OR ${column} < $2)`;
}

// Costo promedio de compra por perfume (incluye flete), igual que en el Resumen.
const AVG_COST = `
  SELECT perfume_id, SUM(quantity * unit_cost + freight_cost) / NULLIF(SUM(quantity), 0) AS avg_cost
  FROM purchases GROUP BY perfume_id`;

// Cada sol que entró o salió, con fecha. Es la misma regla del flujo de caja:
// pandero cuenta por cuotas (no por la venta al entregar) y los abonos solo de
// ventas a crédito.
// Cada fila trae `src` y `ref` (tabla e id de origen) para poder borrarla
// desde la Caja cuando se registró por error.
const BOLSILLO = `CASE WHEN paid_with = 'capital' THEN ' · de tu bolsillo' ELSE '' END`;
const LEDGER = `
  SELECT s.created_at AS t, 'in' AS kind, 'Venta al contado' AS category,
         f.name || COALESCE(' · ' || NULLIF(s.customer_name, ''), '') AS detail,
         s.quantity * s.unit_price AS amount, 'venta' AS src, s.id AS ref
  FROM sales s JOIN perfumes f ON f.id = s.perfume_id
  WHERE s.payment_type = 'contado'
  UNION ALL
  SELECT cp.paid_at, 'in', 'Abono de crédito',
         f.name || COALESCE(' · ' || NULLIF(s.customer_name, ''), ''), cp.amount, 'abono', cp.id
  FROM credit_payments cp JOIN sales s ON s.id = cp.sale_id JOIN perfumes f ON f.id = s.perfume_id
  WHERE s.payment_type = 'credito'
  UNION ALL
  SELECT MIN(rp.created_at), 'in', 'Cuotas de pandero',
         g.name || ' · número ' || COALESCE(e.position::text, '?') || ' (' || COUNT(*) || ' cuotas)',
         SUM(rp.amount), 'pandero', MIN(rp.id)
  FROM pandero_round_payments rp
  JOIN pandero_groups g ON g.id = rp.group_id
  LEFT JOIN pandero_entries e ON e.id = rp.round_entry_id
  GROUP BY rp.group_id, rp.round_entry_id, g.name, e.position
  UNION ALL
  SELECT p.created_at, 'out', 'Compra de mercadería',
         f.name || ' × ' || p.quantity || CASE WHEN p.paid_with = 'capital' THEN ' · de tu bolsillo' ELSE '' END,
         p.quantity * p.unit_cost + p.freight_cost, 'compra', p.id
  FROM purchases p JOIN perfumes f ON f.id = p.perfume_id
  UNION ALL
  SELECT created_at, 'out', 'Gasto · ' || CASE category
           WHEN 'materiales' THEN 'Materiales y empaque' WHEN 'fletes' THEN 'Fletes y envíos'
           WHEN 'publicidad' THEN 'Publicidad' WHEN 'movilidad' THEN 'Movilidad y delivery'
           WHEN 'servicios' THEN 'Servicios' WHEN 'local' THEN 'Local' ELSE 'Otros' END,
         description || ${BOLSILLO}, amount, 'gasto', id
  FROM expenses
  UNION ALL
  SELECT co.created_at, 'out', 'Pago a la vendedora',
         'Comisión · ' || COALESCE(NULLIF(s.sold_by_name, ''), 'Vendedora') || ' · ' || f.name, co.amount, 'comision', co.id
  FROM commission_payouts co JOIN sales s ON s.id = co.sale_id JOIN perfumes f ON f.id = s.perfume_id
  UNION ALL
  SELECT occurred_at, 'out', 'Saqué para mí · ' || CASE purpose
           WHEN 'personal' THEN 'Gasto personal' WHEN 'ahorro' THEN 'Ahorro' WHEN 'otro' THEN 'Otro' ELSE 'Mi sueldo' END,
         COALESCE(NULLIF(note, ''), 'Sin nota'), amount, 'retiro', id
  FROM cash_movements WHERE kind = 'retiro'
  UNION ALL
  SELECT p.paid_at, 'out', 'Pago de deuda',
         d.creditor || COALESCE(' · ' || NULLIF(p.note, ''), '') || CASE WHEN p.paid_with = 'capital' THEN ' · de tu bolsillo' ELSE '' END,
         p.amount, 'deuda', p.id
  FROM debt_payments p JOIN debts d ON d.id = p.debt_id
  UNION ALL
  SELECT occurred_at, 'out', 'Salida anotada en el Reparto · ' || CASE category
           WHEN 'impuestos' THEN 'Impuestos' WHEN 'ganancia' THEN 'Ahorro de ganancia'
           WHEN 'deuda' THEN 'Pago de deuda' ELSE category END,
         COALESCE(NULLIF(note, ''), 'Sin nota'), amount, 'reparto', id
  FROM pf_outflows
  UNION ALL
  SELECT occurred_at, 'out', CASE envelope WHEN 'impuestos' THEN 'Pagué impuestos' ELSE 'Usé la reserva' END,
         COALESCE(NULLIF(note, ''), 'Sin nota'), amount, 'sobre', id
  FROM envelope_movements`;

// Dinero tuyo que entró a la caja ("Puse dinero"). No es venta: solo se
// incluye en la lista de la Caja, no en los ingresos de los reportes.
const LEDGER_CAPITAL = `
  SELECT occurred_at AS t, 'capital' AS kind, 'Puse dinero · ' || CASE purpose
           WHEN 'mercaderia' THEN 'Para comprar mercadería' WHEN 'gastos' THEN 'Para pagar gastos'
           WHEN 'deuda' THEN 'Para pagar una deuda' WHEN 'caja' THEN 'Para tener dinero en caja' ELSE 'Otro' END AS category,
         COALESCE(NULLIF(note, ''), 'Sin nota') AS detail, amount, 'aporte' AS src, id AS ref
  FROM cash_movements WHERE kind = 'aporte'`;

const money = (value) => Math.round(Number(value || 0) * 100) / 100;

// ---------- General: ingresos, salidas y evolución ----------

export async function getOverviewReport(range) {
  await ensureSchema();
  const pool = getPool();
  const params = [range.start, range.end];
  const granularity = granularityFor(range);
  const format = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';

  const [flow, trend, losses] = await Promise.all([
    getCashFlow({ start: range.start, end: range.end }),
    pool.query(
      `SELECT to_char(t AT TIME ZONE 'America/Lima', $3) AS bucket,
              COALESCE(SUM(amount) FILTER (WHERE kind = 'in'), 0) AS income,
              COALESCE(SUM(amount) FILTER (WHERE kind = 'out'), 0) AS outflow
       FROM (${LEDGER}) m
       WHERE ${inRange('t')}
       GROUP BY 1 ORDER BY 1`,
      [...params, format],
    ),
    pool.query(
      `SELECT COALESCE(SUM(quantity * unit_cost), 0) AS total, COALESCE(SUM(quantity), 0)::int AS units
       FROM stock_losses WHERE ${inRange('occurred_at')}`,
      params,
    ),
  ]);

  const outflow =
    flow.purchases + flow.expenses + flow.commissionsPaid + flow.withdrawals + flow.debtPayments + flow.pfOutflows;
  return {
    granularity,
    buckets: fillBuckets(trend.rows, range, granularity),
    income: money(flow.incomeTotal),
    outflow: money(outflow),
    result: money(flow.incomeTotal - outflow),
    capitalIn: money(flow.capitalIn),
    incomeBySource: [
      { label: 'Ventas al contado', value: money(flow.contado) },
      { label: 'Abonos de crédito', value: money(flow.creditPayments) },
      { label: 'Cuotas de pandero', value: money(flow.panderoClosed + flow.panderoThisWeek) },
    ],
    outflowByType: [
      { label: 'Compras de mercadería', value: money(flow.purchases), capital: money(flow.purchasesCapital) },
      { label: 'Gastos', value: money(flow.expenses), capital: money(flow.expensesCapital) },
      { label: 'Comisiones pagadas', value: money(flow.commissionsPaid) },
      { label: 'Retiros (mi sueldo)', value: money(flow.withdrawals) },
      { label: 'Pago de deudas', value: money(flow.debtPayments), capital: money(flow.debtPaymentsCapital) },
      { label: 'Impuestos, reserva y otras', value: money(flow.pfOutflows) },
    ],
    losses: { total: money(losses.rows[0].total), units: losses.rows[0].units },
  };
}

/** Completa con ceros los días/meses sin movimiento para que el eje sea continuo. */
function fillBuckets(rows, range, granularity) {
  const byKey = new Map(rows.map((r) => [r.bucket, r]));
  const keys = [];
  if (granularity === 'day') {
    // No se dibujan los días que todavía no llegan (ej. "Este mes").
    const today = limaParts(new Date());
    const stop = Math.min(range.end.getTime(), limaMidnight(today.y, today.m, today.d + 1).getTime());
    for (let t = range.start.getTime(); t < stop; t += DAY_MS) keys.push(toDayString(new Date(t)));
  } else {
    const first = range.start ? toDayString(range.start).slice(0, 7) : rows[0]?.bucket;
    const lastDate = range.end ? new Date(range.end.getTime() - 1) : new Date();
    const last = range.end ? toDayString(lastDate).slice(0, 7) : rows.at(-1)?.bucket || toDayString(lastDate).slice(0, 7);
    if (first) {
      let [y, m] = first.split('-').map(Number);
      const [ly, lm] = (last > first ? last : first).split('-').map(Number);
      while (y < ly || (y === ly && m <= lm)) {
        keys.push(`${y}-${String(m).padStart(2, '0')}`);
        m += 1;
        if (m > 12) [y, m] = [y + 1, 1];
      }
    }
  }
  return keys.map((key) => ({
    key,
    income: money(byKey.get(key)?.income),
    outflow: money(byKey.get(key)?.outflow),
  }));
}

// ---------- Ventas ----------

const SELLER_LABEL = `CASE WHEN s.sold_by_name LIKE 'Tienda web%' THEN 'Tienda web'
  ELSE COALESCE(NULLIF(s.sold_by_name, ''), CASE WHEN s.sold_by_role = 'admin' THEN 'Admin' ELSE 'Vendedora' END) END`;

export async function getSalesReport(range) {
  await ensureSchema();
  const pool = getPool();
  const params = [range.start, range.end];
  const base = `FROM sales s JOIN perfumes f ON f.id = s.perfume_id
                LEFT JOIN (${AVG_COST}) pc ON pc.perfume_id = s.perfume_id
                WHERE ${inRange('s.created_at')}`;

  const [totals, top, sellers, payments, channels] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(s.quantity), 0)::int AS units,
              COALESCE(SUM(s.quantity * s.unit_price), 0) AS revenue,
              COALESCE(SUM(s.quantity * pc.avg_cost), 0) AS cost,
              COALESCE(SUM(s.commission_amount), 0) AS commissions,
              COUNT(*) FILTER (WHERE pc.avg_cost IS NULL)::int AS without_cost
       ${base}`,
      params,
    ),
    pool.query(
      `SELECT f.id, f.name, SUM(s.quantity)::int AS units, SUM(s.quantity * s.unit_price) AS revenue,
              SUM(s.quantity * pc.avg_cost) AS cost, bool_and(pc.avg_cost IS NOT NULL) AS has_cost
       ${base}
       GROUP BY f.id, f.name ORDER BY revenue DESC LIMIT 15`,
      params,
    ),
    pool.query(
      `SELECT ${SELLER_LABEL} AS label, COUNT(*)::int AS count, SUM(s.quantity * s.unit_price) AS revenue,
              COALESCE(SUM(s.commission_amount), 0) AS commissions
       ${base} GROUP BY 1 ORDER BY revenue DESC`,
      params,
    ),
    pool.query(
      `SELECT s.payment_type AS key, COUNT(*)::int AS count, SUM(s.quantity * s.unit_price) AS revenue
       ${base} GROUP BY 1 ORDER BY revenue DESC`,
      params,
    ),
    pool.query(
      `SELECT CASE WHEN s.sold_by_name LIKE 'Tienda web%' THEN 'Tienda web' ELSE 'Venta directa' END AS label,
              COUNT(*)::int AS count, SUM(s.quantity * s.unit_price) AS revenue
       ${base} GROUP BY 1 ORDER BY revenue DESC`,
      params,
    ),
  ]);

  const t = totals.rows[0];
  const revenue = money(t.revenue);
  const cost = money(t.cost);
  const commissions = money(t.commissions);
  const grossProfit = money(revenue - cost - commissions);
  const toNum = (rows) => rows.map((r) => ({ ...r, revenue: money(r.revenue), commissions: money(r.commissions) }));

  return {
    count: t.count,
    units: t.units,
    revenue,
    cost,
    commissions,
    grossProfit,
    margin: revenue > 0 ? grossProfit / revenue : 0,
    averageTicket: t.count > 0 ? money(revenue / t.count) : 0,
    withoutCost: t.without_cost,
    top: top.rows.map((r) => {
      const rev = money(r.revenue);
      const c = money(r.cost);
      return { ...r, revenue: rev, cost: c, profit: r.has_cost ? money(rev - c) : null, margin: r.has_cost && rev > 0 ? (rev - c) / rev : null };
    }),
    sellers: toNum(sellers.rows),
    payments: toNum(payments.rows),
    channels: toNum(channels.rows),
  };
}

// ---------- Movimientos (libro de caja) ----------

export async function getLedger(range, limit = 3000, { includeCapital = false } = {}) {
  await ensureSchema();
  const source = includeCapital ? `${LEDGER} UNION ALL ${LEDGER_CAPITAL}` : LEDGER;
  const { rows } = await getPool().query(
    `SELECT t, kind, category, detail, amount, src, ref FROM (${source}) m
     WHERE ${inRange('t')} ORDER BY t DESC LIMIT ${Number(limit)}`,
    [range.start, range.end],
  );
  return rows.map((r) => ({ ...r, amount: money(r.amount) }));
}

// ---------- Por cobrar (al día de hoy) ----------

export const AGE_BUCKETS = [
  { key: '0-30', label: 'Hasta 30 días', max: 30 },
  { key: '31-60', label: '31 a 60 días', max: 60 },
  { key: '61-90', label: '61 a 90 días', max: 90 },
  { key: '90+', label: 'Más de 90 días', max: Infinity },
];

export async function getReceivablesReport() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT s.id, s.customer_name, f.name AS perfume, s.payment_type, s.created_at,
           s.quantity * s.unit_price AS total, COALESCE(cp.paid, 0) AS paid
    FROM sales s
    JOIN perfumes f ON f.id = s.perfume_id
    LEFT JOIN (SELECT sale_id, SUM(amount) AS paid FROM credit_payments GROUP BY sale_id) cp ON cp.sale_id = s.id
    WHERE s.payment_type IN ('credito', 'pandero')
      AND s.quantity * s.unit_price - COALESCE(cp.paid, 0) > 0.005
    ORDER BY s.created_at ASC
  `);

  const now = Date.now();
  const ages = new Map(AGE_BUCKETS.map((b) => [b.key, { ...b, total: 0, count: 0 }]));
  const customers = new Map();
  for (const row of rows) {
    const balance = money(Number(row.total) - Number(row.paid));
    const days = Math.floor((now - new Date(row.created_at).getTime()) / DAY_MS);
    const bucket = AGE_BUCKETS.find((b) => days <= b.max);
    const age = ages.get(bucket.key);
    age.total = money(age.total + balance);
    age.count += 1;

    const name = (row.customer_name || 'Sin nombre').trim();
    const key = name.toLowerCase();
    const c = customers.get(key) || { name, balance: 0, sales: 0, oldestDays: 0, items: [] };
    c.balance = money(c.balance + balance);
    c.sales += 1;
    c.oldestDays = Math.max(c.oldestDays, days);
    c.items.push(row.perfume);
    customers.set(key, c);
  }

  const list = [...customers.values()].sort((a, b) => b.balance - a.balance);
  return {
    total: money(list.reduce((sum, c) => sum + c.balance, 0)),
    customers: list,
    ages: [...ages.values()],
  };
}

// ---------- Inventario (al día de hoy) ----------

const DORMANT_DAYS = 60;

export async function getInventoryReport() {
  await ensureSchema();
  const { rows } = await getPool().query(`
    SELECT f.id, f.name, f.stock, f.price, pc.avg_cost, ls.last_sale
    FROM perfumes f
    LEFT JOIN (${AVG_COST}) pc ON pc.perfume_id = f.id
    LEFT JOIN (SELECT perfume_id, MAX(created_at) AS last_sale FROM sales GROUP BY perfume_id) ls
      ON ls.perfume_id = f.id
    ORDER BY f.name
  `);

  const now = Date.now();
  let units = 0;
  let costValue = 0;
  let retailValue = 0;
  let retailWithCost = 0;
  let withoutCost = 0;
  const dormant = [];
  const low = [];
  const out = [];
  for (const p of rows) {
    const stock = Number(p.stock) || 0;
    const avg = p.avg_cost == null ? null : Number(p.avg_cost);
    if (stock > 0) {
      units += stock;
      retailValue += stock * Number(p.price);
      if (avg == null) {
        withoutCost += 1;
      } else {
        costValue += stock * avg;
        retailWithCost += stock * Number(p.price);
      }
      const idleDays = p.last_sale ? Math.floor((now - new Date(p.last_sale).getTime()) / DAY_MS) : null;
      if (idleDays == null || idleDays > DORMANT_DAYS) {
        dormant.push({ name: p.name, stock, idleDays, tied: avg == null ? null : money(stock * avg) });
      }
      if (stock <= 3) low.push({ name: p.name, stock });
    } else if (Number(p.price) > 0) {
      out.push({ name: p.name, lastSale: p.last_sale });
    }
  }
  dormant.sort((a, b) => (b.tied ?? 0) - (a.tied ?? 0));

  return {
    units,
    costValue: money(costValue),
    retailValue: money(retailValue),
    // Solo de los perfumes con costo conocido, para no inflarla.
    potentialProfit: money(retailWithCost - costValue),
    withoutCost,
    dormantDays: DORMANT_DAYS,
    dormant,
    low,
    out,
  };
}

// ---------- Pagos: todo lo que salió, por concepto ----------

/**
 * Lo que pagaste en el rango, agrupado por concepto (vendedora, tu sueldo,
 * deudas, cada categoría de gasto y la mercadería), más lo pendiente de pagar
 * hoy (comisión de la vendedora y saldo de deudas).
 */
export async function getPaymentsSummary(range) {
  await ensureSchema();
  const pool = getPool();
  const params = [range.start, range.end];
  const [flow, expenses, pendingCommission, pendingDebt] = await Promise.all([
    getCashFlow({ start: range.start, end: range.end }),
    pool.query(
      `SELECT COALESCE(category, 'otros') AS category, COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE ${inRange('created_at')} GROUP BY 1`,
      params,
    ),
    // Comisión ya ganada por la vendedora (según lo cobrado) que todavía no se le pagó.
    pool.query(`
      SELECT COALESCE(SUM(
               CASE WHEN s.payment_type = 'contado' OR s.quantity * s.unit_price <= 0
                 THEN COALESCE(s.commission_amount, 0)
                 ELSE COALESCE(s.commission_amount, 0) * LEAST(COALESCE(cp.paid, 0) / (s.quantity * s.unit_price), 1)
               END), 0) - COALESCE(SUM(s.commission_paid_amount), 0) AS due
      FROM sales s
      LEFT JOIN (SELECT sale_id, SUM(amount) AS paid FROM credit_payments GROUP BY sale_id) cp ON cp.sale_id = s.id
      WHERE s.commission_amount IS NOT NULL
    `),
    pool.query(`
      SELECT COALESCE(SUM(GREATEST(d.total - COALESCE(p.paid, 0), 0)), 0) AS owed,
             COUNT(*) FILTER (WHERE d.total - COALESCE(p.paid, 0) > 0.005)::int AS count
      FROM debts d
      LEFT JOIN (SELECT debt_id, SUM(amount) AS paid FROM debt_payments GROUP BY debt_id) p ON p.debt_id = d.id
    `),
  ]);

  const expenseRows = expenses.rows.map((r) => ({ category: r.category, count: r.count, total: money(r.total) }));
  const groups = [
    { key: 'vendedora', label: 'Comisiones a la vendedora', total: money(flow.commissionsPaid), href: '/admin/comisiones' },
    { key: 'sueldo', label: 'Saqué para mí (sueldo)', total: money(flow.withdrawals), href: '/admin/caja' },
    {
      key: 'deudas',
      label: 'Pago de deudas',
      total: money(flow.debtPayments),
      capital: money(flow.debtPaymentsCapital),
      href: '/admin/deudas',
    },
    {
      key: 'gastos',
      label: 'Gastos del negocio',
      total: money(flow.expenses),
      capital: money(flow.expensesCapital),
      href: '/admin/gastos',
      children: expenseRows,
    },
    {
      key: 'reparto',
      label: 'Impuestos, reserva y otras salidas',
      total: money(flow.pfOutflows),
      href: '/admin/caja',
    },
    {
      key: 'mercaderia',
      label: 'Compra de mercadería',
      total: money(flow.purchases),
      capital: money(flow.purchasesCapital),
      href: '/admin/compras',
    },
  ];
  return {
    groups,
    total: money(groups.reduce((sum, g) => sum + g.total, 0)),
    pending: {
      commission: Math.max(money(pendingCommission.rows[0].due), 0),
      debt: money(pendingDebt.rows[0].owed),
      debtCount: pendingDebt.rows[0].count,
    },
  };
}
