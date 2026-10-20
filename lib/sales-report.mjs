// Cálculos del reporte de Ventas a partir de las filas de venta (sin base de datos,
// para poder probarlos). Cada fila: { id, created_at, perfume_id, name, image,
// category, quantity, decant_ml, revenue, cost (null si no hay compra registrada),
// commission, logistics, other_costs, customer, payment_type, web_method,
// web_status, order_code }.

const LIMA_OFFSET_MS = 5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

export const CATEGORY_LABELS = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };
export const GRANULARITIES = { dia: 'Día', semana: 'Semana', mes: 'Mes', anio: 'Año' };

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const num = (value) => Number(value) || 0;

/** Ganancia de una venta: precio − costo − comisión − envío − otros costos. */
export function rowProfit(r) {
  return num(r.revenue) - num(r.cost) - num(r.commission) - num(r.logistics) - num(r.other_costs);
}

/** Un pedido web con varios perfumes cuenta como un solo pedido. */
const orderKey = (r) => (r.order_code ? `w${r.order_code}` : `v${r.id}`);
export const customerKey = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

function limaDay(date) {
  const lima = new Date(new Date(date).getTime() - LIMA_OFFSET_MS);
  return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate() };
}
const pad = (n) => String(n).padStart(2, '0');
const dayString = ({ y, m, d }) => {
  const t = new Date(Date.UTC(y, m, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

/** Clave del grupo (hora de Lima): día "2026-10-20", semana (su lunes), mes "2026-10" o año "2026". */
export function bucketKey(date, granularity) {
  const p = limaDay(date);
  if (granularity === 'anio') return String(p.y);
  if (granularity === 'mes') return `${p.y}-${pad(p.m + 1)}`;
  if (granularity === 'semana') {
    const weekday = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
    return dayString({ y: p.y, m: p.m, d: p.d - ((weekday + 6) % 7) });
  }
  return dayString(p);
}

/** Todas las claves entre inicio y fin (sin días futuros), para que el eje sea continuo. */
export function bucketKeys(start, end, granularity, now = new Date()) {
  if (!start) return [];
  const today = limaDay(now);
  const tomorrow = Date.UTC(today.y, today.m, today.d + 1) + LIMA_OFFSET_MS;
  const stop = Math.min(end ? new Date(end).getTime() : tomorrow, tomorrow);
  const keys = [];
  // Hora de Lima al mediodía de cada día: así un salto de día nunca se repite ni se salta.
  for (let t = new Date(start).getTime() + 12 * 3600 * 1000; t < stop; t += DAY_MS) {
    const key = bucketKey(new Date(t), granularity);
    if (keys.at(-1) !== key) keys.push(key);
  }
  return keys;
}

/** Totales del período. */
export function summarize(rows) {
  const t = { revenue: 0, cost: 0, commission: 0, logistics: 0, otherCosts: 0, units: 0, withoutCost: 0 };
  const orders = new Set();
  const customers = new Set();
  const byProduct = new Map();
  for (const r of rows) {
    t.revenue += num(r.revenue);
    t.cost += num(r.cost);
    t.commission += num(r.commission);
    t.logistics += num(r.logistics);
    t.otherCosts += num(r.other_costs);
    t.units += num(r.quantity);
    if (r.cost == null) t.withoutCost += 1;
    orders.add(orderKey(r));
    const c = customerKey(r.customer);
    if (c) customers.add(c);
    const name = productName(r);
    byProduct.set(name, (byProduct.get(name) || 0) + num(r.quantity));
  }
  const profit = t.revenue - t.cost - t.commission - t.logistics - t.otherCosts;
  const best = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    revenue: money(t.revenue),
    cost: money(t.cost),
    commission: money(t.commission),
    logistics: money(t.logistics),
    otherCosts: money(t.otherCosts),
    profit: money(profit),
    margin: t.revenue > 0 ? profit / t.revenue : 0,
    orders: orders.size,
    sales: rows.length,
    units: t.units,
    averageTicket: orders.size > 0 ? money(t.revenue / orders.size) : 0,
    customers: customers.size,
    withoutCost: t.withoutCost,
    topProduct: best ? { name: best[0], units: best[1] } : null,
  };
}

/** Cambio frente al período anterior (0.125 = +12,5 %); null si antes no hubo nada. */
export function change(current, previous) {
  if (previous == null || Number(previous) === 0) return null;
  return (Number(current) - Number(previous)) / Math.abs(Number(previous));
}

export function productName(r) {
  return r.decant_ml ? `${r.name} · decant ${Number(r.decant_ml)} ml` : r.name;
}

/** Por perfume (y presentación): unidades, ingreso, costo, ganancia y margen. */
export function groupProducts(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.perfume_id}-${num(r.decant_ml)}`;
    const p =
      map.get(key) ||
      {
        key,
        id: r.perfume_id,
        name: productName(r),
        image: r.image || null,
        category: CATEGORY_LABELS[r.category] || r.category || '—',
        units: 0,
        revenue: 0,
        cost: 0,
        expenses: 0,
        hasCost: true,
      };
    p.units += num(r.quantity);
    p.revenue += num(r.revenue);
    p.cost += num(r.cost);
    p.expenses += num(r.commission) + num(r.logistics) + num(r.other_costs);
    if (r.cost == null) p.hasCost = false;
    map.set(key, p);
  }
  return [...map.values()]
    .map((p) => {
      const profit = p.revenue - p.cost - p.expenses;
      return {
        ...p,
        revenue: money(p.revenue),
        cost: p.hasCost ? money(p.cost) : null,
        expenses: money(p.expenses),
        unitCost: p.hasCost && p.units > 0 ? money(p.cost / p.units) : null,
        avgPrice: p.units > 0 ? money(p.revenue / p.units) : 0,
        profit: p.hasCost ? money(profit) : null,
        margin: p.hasCost && p.revenue > 0 ? profit / p.revenue : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/** Agrupa por una etiqueta: operaciones (pedidos), monto y % del total. */
export function groupBy(rows, labelOf) {
  const map = new Map();
  let total = 0;
  for (const r of rows) {
    const label = labelOf(r);
    const g = map.get(label) || { label, orders: new Set(), units: 0, revenue: 0, profit: 0 };
    g.orders.add(orderKey(r));
    g.units += num(r.quantity);
    g.revenue += num(r.revenue);
    g.profit += rowProfit(r);
    total += num(r.revenue);
    map.set(label, g);
  }
  return [...map.values()]
    .map((g) => ({
      label: g.label,
      count: g.orders.size,
      units: g.units,
      revenue: money(g.revenue),
      profit: money(g.profit),
      share: total > 0 ? g.revenue / total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Clientes del período. `firstPurchase`: Map clave → primera compra de su
 * historia, para saber si es nuevo (primera compra en este período) o recurrente.
 */
export function groupCustomers(rows, firstPurchase = new Map(), range = {}) {
  const map = new Map();
  for (const r of rows) {
    const key = customerKey(r.customer);
    if (!key) continue;
    const c =
      map.get(key) || { key, name: String(r.customer).trim(), orders: new Set(), revenue: 0, last: null, products: new Map() };
    c.orders.add(orderKey(r));
    c.revenue += num(r.revenue);
    const at = new Date(r.created_at);
    if (!c.last || at > c.last) c.last = at;
    const name = productName(r);
    c.products.set(name, (c.products.get(name) || 0) + num(r.quantity));
    map.set(key, c);
  }
  const list = [...map.values()]
    .map((c) => {
      const first = firstPurchase.get(c.key);
      const isNew = !first || !range.start || new Date(first) >= new Date(range.start);
      return {
        key: c.key,
        name: c.name,
        orders: c.orders.size,
        revenue: money(c.revenue),
        averageTicket: money(c.revenue / c.orders.size),
        last: c.last.toISOString(),
        topProduct: [...c.products.entries()].sort((a, b) => b[1] - a[1])[0][0],
        // Recurrente: más de un pedido en el período o ya te había comprado antes.
        type: c.orders.size > 1 || !isNew ? 'recurrente' : 'nuevo',
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  // Mejores clientes: los 3 que más te compraron en el período.
  list.slice(0, 3).forEach((c) => {
    c.best = true;
  });
  return list;
}

/** Ventas, ganancia y pedidos por día / semana / mes / año. */
export function trend(rows, keys, granularity) {
  const map = new Map(keys.map((k) => [k, { key: k, revenue: 0, profit: 0, orders: new Set() }]));
  for (const r of rows) {
    const key = bucketKey(r.created_at, granularity);
    const b = map.get(key) || { key, revenue: 0, profit: 0, orders: new Set() };
    b.revenue += num(r.revenue);
    b.profit += rowProfit(r);
    b.orders.add(orderKey(r));
    map.set(key, b);
  }
  return [...map.values()]
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((b) => ({ key: b.key, revenue: money(b.revenue), profit: money(b.profit), orders: b.orders.size }));
}
