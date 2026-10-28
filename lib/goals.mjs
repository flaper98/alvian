// Metas del negocio: cálculos puros (sin base de datos) para poder probarlos.
// Los montos se calculan en céntimos enteros para no arrastrar decimales.

const cents = (value) => Math.round((Number(value) || 0) * 100);
const soles = (value) => value / 100;
const DAY_MS = 24 * 3600 * 1000;

/** Metas de dinero con fecha: juntar X soles en un sobre o en la caja. */
export const GOAL_METRICS = {
  compras: {
    label: 'Dinero para compras',
    hint: 'Lo que tienes en los sobres «Para reponer» y «Para crecer».',
  },
  caja: { label: 'Dinero en caja', hint: 'Todo el dinero del negocio hoy.' },
  reserva: { label: 'Colchón', hint: 'Tu sobre de reserva para gastos e imprevistos.' },
};

/** Metas de cada mes, medidas con las ventas que registras. */
export const MONTHLY_METRICS = [
  { key: 'ventas', label: 'Vendido', money: true, hint: 'Total de las ventas del mes.' },
  { key: 'utilidad', label: 'Ganancia', money: true, hint: 'Lo que te queda después del costo, la comisión y los envíos.' },
  { key: 'numero', label: 'Número de ventas', money: false, hint: 'Cuántas ventas registraste.' },
  { key: 'ticket', label: 'Venta promedio', money: true, hint: 'Lo vendido entre el número de ventas.' },
];

export const isGoalMetric = (key) => Object.hasOwn(GOAL_METRICS, key);
export const isMonthlyMetric = (key) => MONTHLY_METRICS.some((m) => m.key === key);

/** Días enteros entre dos fechas 'YYYY-MM-DD' (b − a). */
function daysFrom(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/**
 * Avance de una meta de dinero.
 * - current: cuánto hay hoy.
 * - in30 / out30: lo que entró y salió de ese dinero en los últimos 30 días.
 * - sales30: lo vendido en los últimos 30 días (para decir cuánto más vender).
 * Devuelve cuánto falta, cuánto juntar por semana, adónde llegas a este ritmo
 * y cuánto puedes gastar por semana sin dejar de llegar.
 */
export function goalProgress({ current, target, deadline, today, in30 = 0, out30 = 0, sales30 = 0 }) {
  const now = cents(current);
  const goal = cents(target);
  const remaining = Math.max(goal - now, 0);
  const daysLeft = Math.max(daysFrom(today, deadline), 0);
  const weeksLeft = daysLeft / 7;
  const inPerDay = cents(in30) / 30;
  const netPerDay = (cents(in30) - cents(out30)) / 30;
  const projected = Math.round(now + netPerDay * daysLeft);
  const neededPerWeek = remaining === 0 ? 0 : weeksLeft > 0 ? Math.ceil(remaining / weeksLeft) : remaining;
  // Si no gastaras nada, ¿cuánto juntarías por semana? Lo que sobre se puede gastar.
  const inPerWeek = Math.round(inPerDay * 7);
  const spendPerWeek = remaining === 0 ? null : Math.max(inPerWeek - neededPerWeek, 0);
  // Si ni sin gastar llegas: cuánto más vender por semana, con lo que deja cada sol vendido.
  const perSol = cents(sales30) > 0 ? cents(in30) / cents(sales30) : 0;
  const shortPerWeek = Math.max(neededPerWeek - inPerWeek, 0);
  const moreSalesPerWeek = shortPerWeek > 0 && perSol > 0 ? Math.ceil(shortPerWeek / perSol) : null;

  let status;
  if (remaining === 0) status = 'done';
  else if (daysLeft === 0) status = 'overdue';
  else if (projected >= goal) status = 'on-track';
  else if (inPerWeek >= neededPerWeek) status = 'spend-less';
  else status = 'behind';

  return {
    current: soles(now),
    target: soles(goal),
    remaining: soles(remaining),
    percent: goal > 0 ? Math.max(0, Math.min(100, Math.floor((now / goal) * 100))) : 100,
    daysLeft,
    neededPerWeek: soles(neededPerWeek),
    neededPerMonth: soles(Math.round((neededPerWeek / 7) * 30)),
    inPerWeek: soles(inPerWeek),
    netPerWeek: soles(Math.round(netPerDay * 7)),
    projected: soles(projected),
    spendPerWeek: spendPerWeek == null ? null : soles(spendPerWeek),
    moreSalesPerWeek: moreSalesPerWeek == null ? null : soles(moreSalesPerWeek),
    status,
  };
}

/**
 * Avance de una meta del mes. Para saber si vas a tiempo se compara con lo
 * que deberías llevar a esta altura del mes (la venta promedio no se prorratea).
 */
export function monthProgress({ target, actual, day, daysInMonth, prorate = true }) {
  const goal = Number(target) || 0;
  const value = Number(actual) || 0;
  if (goal <= 0) return { percent: null, expected: null, status: 'none' };
  const expected = prorate ? (goal * day) / daysInMonth : goal;
  const percent = Math.floor((value / goal) * 100);
  const status = value >= goal ? 'done' : value >= expected * 0.95 ? 'on-track' : 'behind';
  return { percent, expected: Math.round(expected * 100) / 100, status };
}

/**
 * Meta sugerida: el promedio de los últimos meses con ventas, un 10% más.
 * Redondea a 50 soles (o a la unidad si no es dinero).
 */
export function suggestTarget(values, { money = true, growth = 0.1 } = {}) {
  const used = values.filter((v) => Number(v) > 0).slice(-3);
  if (!used.length) return null;
  const avg = used.reduce((s, v) => s + Number(v), 0) / used.length;
  const step = money ? 50 : 1;
  return Math.max(step, Math.ceil((avg * (1 + growth)) / step) * step);
}

/** Los últimos `count` meses 'YYYY-MM' hasta `month` incluido, del más antiguo al más nuevo. */
export function lastMonths(month, count) {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}
