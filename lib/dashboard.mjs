// Panel financiero (Reportes → Resumen): cálculos puros sobre los totales de
// cada día, para poder probarlos sin base de datos. Los días son 'YYYY-MM-DD'
// en hora de Lima y los rangos van con el fin exclusivo.
//
//   Ganancia neta = Ventas − Costo de los productos − Gastos
//   Gastos = costos de cada venta (comisión, envío, otros, impuesto)
//          + gastos generales (publicidad, movilidad…) + pérdidas de mercadería

const cents = (value) => Math.round((Number(value) || 0) * 100);
const soles = (value) => value / 100;
const pad = (n) => String(n).padStart(2, '0');
const iso = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const parts = (day) => day.split('-').map(Number);

/** Debajo de este cambio (1%) se considera "sin cambio significativo". */
export const FLAT_CHANGE = 0.01;

/** Suma meses (el día se ajusta al último del mes) o días a una fecha 'YYYY-MM-DD'. */
export function shiftDay(day, { months = 0, days = 0 } = {}) {
  const [y, m, d] = parts(day);
  if (months) {
    const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
    return iso(new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))));
  }
  return iso(new Date(Date.UTC(y, m - 1, d + days)));
}

function daysBetween(a, b) {
  const time = (day) => {
    const [y, m, d] = parts(day);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((time(b) - time(a)) / 86400000);
}

// Cuánto se retrocede para comparar con el período anterior equivalente.
const SHIFTS = {
  hoy: { days: 1 },
  semana: { days: 7 },
  mes: { months: 1 },
  'mes-pasado': { months: 1 },
  '3-meses': { months: 3 },
  '6-meses': { months: 6 },
  anio: { months: 12 },
  'anio-pasado': { months: 12 },
};

/**
 * Período con el que se compara. Si el actual sigue en curso (ej. "Este mes"
 * al día 3), se compara con el mismo avance del anterior (1 al 3 del mes
 * pasado), no con el mes completo. null si el rango es "Todo".
 */
export function comparisonDays({ preset, start, end, today }) {
  if (!start) return null;
  const tomorrow = shiftDay(today, { days: 1 });
  const until = end && end < tomorrow ? end : tomorrow;
  const shift = SHIFTS[preset] || { days: Math.max(daysBetween(start, end || tomorrow), 1) };
  const back = { months: -(shift.months || 0), days: -(shift.days || 0) };
  return { start: shiftDay(start, back), end: shiftDay(until, back), partial: Boolean(end) && until < end };
}

const EMPTY = Object.freeze({
  revenue: 0,
  cost: 0,
  commission: 0,
  saleCosts: 0,
  tax: 0,
  general: 0,
  losses: 0,
  units: 0,
  bottles: 0,
  sales: 0,
  withoutCost: 0,
});
const MONEY_KEYS = ['revenue', 'cost', 'commission', 'saleCosts', 'tax', 'general', 'losses'];

/** Suma los días [start, end). Sin start, desde el primero; sin end, hasta el último. */
export function sumDays(days, start, end) {
  const t = { ...EMPTY };
  for (const row of days) {
    if ((start && row.day < start) || (end && row.day >= end)) continue;
    for (const key of Object.keys(EMPTY)) {
      t[key] += MONEY_KEYS.includes(key) ? cents(row[key]) : Number(row[key]) || 0;
    }
  }
  return t;
}

/** Totales (en céntimos, de sumDays) → ventas, gastos, ganancia neta y margen, en soles. */
export function finance(t) {
  const expenses = t.commission + t.saleCosts + t.tax + t.general + t.losses;
  const profit = t.revenue - t.cost - expenses;
  return {
    revenue: soles(t.revenue),
    cost: soles(t.cost),
    commission: soles(t.commission),
    saleCosts: soles(t.saleCosts),
    tax: soles(t.tax),
    general: soles(t.general),
    losses: soles(t.losses),
    expenses: soles(expenses),
    profit: soles(profit),
    margin: t.revenue > 0 ? profit / t.revenue : null,
    units: t.units,
    bottles: t.bottles,
    decants: t.units - t.bottles,
    sales: t.sales,
    withoutCost: t.withoutCost,
  };
}

/**
 * Cambio frente al período anterior: { ratio, direction }.
 * - ratio: 0.125 = +12,5 %. Es null si antes fue 0 (no se puede dividir) o si
 *   se pasó de ganar a perder o al revés: un "−259%" no se entiende; ahí se
 *   muestran los montos.
 * - direction: 'up' | 'down' | 'flat' (menos de 1%).
 * Con un anterior negativo (pérdida), mejorar cuenta como subir.
 */
export function variation(current, previous) {
  if (previous == null) return null;
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (cents(p) === 0) {
    return { ratio: null, direction: cents(c) > 0 ? 'up' : cents(c) < 0 ? 'down' : 'flat' };
  }
  if (cents(c) !== 0 && Math.sign(c) !== Math.sign(p)) return { ratio: null, direction: c > p ? 'up' : 'down' };
  const ratio = (c - p) / Math.abs(p);
  return { ratio, direction: Math.abs(ratio) < FLAT_CHANGE ? 'flat' : ratio > 0 ? 'up' : 'down' };
}

/** Meses 'YYYY-MM' desde el mes de `from` hasta el de `to` (incluidos). */
export function monthKeys(from, to) {
  const [fy, fm] = parts(from);
  const [ty, tm] = parts(to);
  const keys = [];
  for (let y = fy, m = fm; y < ty || (y === ty && m <= tm); m === 12 ? ((y += 1), (m = 1)) : (m += 1)) {
    keys.push(`${y}-${pad(m)}`);
  }
  return keys;
}

/**
 * Meses del gráfico: los del período elegido y, si son menos de `min`, los
 * anteriores hasta completar `min`, para ver la tendencia. Nunca meses futuros.
 */
export function chartMonths({ start, end, today, firstDay, min = 6 }) {
  const tomorrow = shiftDay(today, { days: 1 });
  const lastDay = shiftDay(end && end < tomorrow ? end : tomorrow, { days: -1 });
  const from = start || firstDay || today;
  const keys = monthKeys(from <= lastDay ? from : lastDay, lastDay);
  if (keys.length >= min) return keys.map((key) => ({ key, selected: true }));
  const first = shiftDay(`${keys[0]}-01`, { months: keys.length - min });
  return monthKeys(first, lastDay).map((key) => ({ key, selected: keys.includes(key) }));
}

/** Ventas, gastos, ganancia y margen de cada mes. */
export function monthlySeries(days, months) {
  return months.map(({ key, selected }) => {
    const start = `${key}-01`;
    return { key, selected, ...finance(sumDays(days, start, shiftDay(start, { months: 1 }))) };
  });
}

/**
 * Productos del período (filas agrupadas por perfume y presentación):
 * los más vendidos (por unidades) y los que más ganancia dejan.
 */
export function rankProducts(rows, totalRevenue, limit = 10) {
  const total = cents(totalRevenue);
  const items = rows.map((r) => {
    const revenue = cents(r.revenue);
    const cost = cents(r.cost);
    const profit = revenue - cost - cents(r.saleCosts);
    return {
      key: `${r.perfumeId}-${r.decantMl ?? ''}`,
      perfumeId: r.perfumeId,
      name: r.decantMl ? `${r.name} · decant ${Number(r.decantMl)} ml` : r.name,
      units: Number(r.units) || 0,
      revenue: soles(revenue),
      cost: soles(cost),
      profit: soles(profit),
      margin: revenue > 0 ? profit / revenue : null,
      share: total > 0 ? revenue / total : 0,
      costKnown: !(Number(r.withoutCost) > 0),
    };
  });
  const byName = (a, b) => a.name.localeCompare(b.name, 'es');
  return {
    topSellers: [...items].sort((a, b) => b.units - a.units || b.revenue - a.revenue || byName(a, b)).slice(0, limit),
    topProfit: [...items].sort((a, b) => b.profit - a.profit || byName(a, b)).slice(0, limit),
  };
}
