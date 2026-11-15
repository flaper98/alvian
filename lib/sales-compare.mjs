// Comparativo de ventas (hora de Lima): hoy vs. ayer, esta semana vs. la pasada
// y este mes vs. el pasado, siempre a la misma altura (del 1 al 15 contra del 1
// al 15), la evolución de los últimos meses, semanas y días, y el día de la
// semana en que más vendes. Sin base de datos, para poder probarlo. Las filas
// son las del reporte de Ventas (ver sales-report.mjs).
import { bucketKey, orderKey, rowProfit } from './sales-report.mjs';

const LIMA_OFFSET_MS = 5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;
const WEEK_MS = 7 * DAY_MS;

const money = (value) => Math.round(Number(value || 0) * 100) / 100;
const num = (value) => Number(value) || 0;
const time = (date) => new Date(date).getTime();
const oneDecimal = (value) => Math.round(value * 10) / 10;

function limaParts(ms) {
  const lima = new Date(ms - LIMA_OFFSET_MS);
  return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate(), weekday: (lima.getUTCDay() + 6) % 7 };
}

/** Medianoche de Lima como instante UTC (acepta días y meses fuera de rango). */
const midnight = (y, m, d) => Date.UTC(y, m, d) + LIMA_OFFSET_MS;

export const COMPARE_KINDS = ['dia', 'semana', 'mes'];

/** Totales de un grupo de ventas. `units` = frascos; los decants van aparte. */
export function periodStats(rows) {
  let revenue = 0;
  let profit = 0;
  let units = 0;
  let decants = 0;
  const orders = new Set();
  for (const r of rows) {
    revenue += num(r.revenue);
    profit += rowProfit(r);
    if (r.decant_ml) decants += num(r.quantity);
    else units += num(r.quantity);
    orders.add(orderKey(r));
  }
  return {
    revenue: money(revenue),
    profit: money(profit),
    units,
    decants,
    orders: orders.size,
    ticket: orders.size ? money(revenue / orders.size) : 0,
  };
}

/** Inicio del día, la semana (de lunes) o el mes que está `back` lugares antes del actual. */
function periodStart(kind, now, back = 0) {
  const p = limaParts(time(now));
  if (kind === 'dia') return midnight(p.y, p.m, p.d - back);
  if (kind === 'semana') return midnight(p.y, p.m, p.d - p.weekday - 7 * back);
  return midnight(p.y, p.m - back, 1);
}

/**
 * Límites (instantes UTC) del período en curso y del anterior. `prevSameEnd`
 * es el anterior "a la misma altura": el mismo tiempo transcurrido, sin pasarse
 * de su fin (el 31 de marzo se compara con todo febrero).
 */
export function periodBounds(kind, now) {
  const t = time(now);
  const start = periodStart(kind, t);
  const prevStart = periodStart(kind, t, 1);
  const next = periodStart(kind, t, -1);
  return { start, now: t, next, prevStart, prevSameEnd: Math.min(prevStart + (t - start), start), prevEnd: start };
}

const between = (rows, from, to) =>
  rows.filter((r) => {
    const x = time(r.created_at);
    return x >= from && x < to;
  });

/** El período en curso contra el anterior a la misma altura, el anterior completo y a qué ritmo vas. */
export function compareCurrent(rows, kind, now) {
  const b = periodBounds(kind, now);
  const current = periodStats(between(rows, b.start, b.now + 1));
  const elapsedDays = (b.now - b.start) / DAY_MS;
  const ratio = (b.now - b.start) / (b.next - b.start);
  // "A este ritmo cierras con…": solo semana y mes, con al menos 2 o 3 días de datos.
  const projection =
    (kind === 'semana' && elapsedDays >= 2) || (kind === 'mes' && elapsedDays >= 3)
      ? { units: Math.round(current.units / ratio), revenue: money(current.revenue / ratio) }
      : null;
  return {
    kind,
    bounds: b,
    current,
    previous: periodStats(between(rows, b.prevStart, b.prevSameEnd)),
    previousFull: periodStats(between(rows, b.prevStart, b.prevEnd)),
    projection,
  };
}

/**
 * Los últimos `count` días, semanas o meses, del más antiguo al actual (que va
 * en curso), con sus totales y los perfumes por día.
 */
export function periodSeries(rows, kind, count, now) {
  const t = time(now);
  const groups = new Map();
  for (const r of rows) {
    const key = bucketKey(r.created_at, kind);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const list = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const start = periodStart(kind, t, back);
    const end = back === 0 ? t : periodStart(kind, t, back - 1);
    const key = bucketKey(new Date(start + 12 * 3600 * 1000), kind);
    const stats = periodStats(groups.get(key) || []);
    const days = Math.max(1, Math.ceil((end - start) / DAY_MS));
    list.push({ key, start, end, current: back === 0, days, ...stats, perDay: oneDecimal(stats.units / days) });
  }
  return list;
}

/**
 * Promedio de perfumes y de ventas por día de la semana (lunes = 0) en las
 * últimas semanas completas (hasta `weeks`, o desde la primera venta si hay menos).
 */
export function weekdayStats(rows, now, weeks = 12) {
  const end = periodStart('semana', now);
  const first = rows.reduce((min, r) => Math.min(min, time(r.created_at)), Infinity);
  if (!Number.isFinite(first) || first >= end) return { weeks: 0, days: [] };
  const n = Math.min(weeks, Math.round((end - periodStart('semana', first)) / WEEK_MS));
  const sums = Array.from({ length: 7 }, () => ({ units: 0, revenue: 0 }));
  for (const r of between(rows, end - n * WEEK_MS, end)) {
    const s = sums[limaParts(time(r.created_at)).weekday];
    if (!r.decant_ml) s.units += num(r.quantity);
    s.revenue += num(r.revenue);
  }
  return {
    weeks: n,
    days: sums.map((s, weekday) => ({ weekday, units: oneDecimal(s.units / n), revenue: money(s.revenue / n) })),
  };
}

/**
 * Quita los períodos vacíos del principio (antes de la primera venta); el actual
 * siempre queda. Si se quitó alguno, el negocio empezó dentro del primero que
 * queda: sus perfumes por día se cuentan desde el día de la primera venta.
 */
function trimLeading(list, firstSale) {
  const first = list.findIndex((p) => p.orders > 0);
  if (first < 0) return list.slice(-1);
  const kept = list.slice(first);
  if (first > 0 && Number.isFinite(firstSale)) {
    const p = kept[0];
    const { y, m, d } = limaParts(firstSale);
    const days = Math.max(1, Math.ceil((p.end - Math.max(p.start, midnight(y, m, d))) / DAY_MS));
    kept[0] = { ...p, days, perDay: oneDecimal(p.units / days) };
  }
  return kept;
}

/** Todo el Comparativo de una vez. */
export function buildComparison(rows, now) {
  const firstSale = rows.reduce((min, r) => Math.min(min, time(r.created_at)), Infinity);
  return {
    now: time(now),
    compare: Object.fromEntries(COMPARE_KINDS.map((k) => [k, compareCurrent(rows, k, now)])),
    series: {
      mes: trimLeading(periodSeries(rows, 'mes', 6, now), firstSale),
      semana: trimLeading(periodSeries(rows, 'semana', 8, now), firstSale),
      dia: trimLeading(periodSeries(rows, 'dia', 14, now), firstSale),
    },
    weekdays: weekdayStats(rows, now),
  };
}
