// Plan de caja anual: lo que entró y salió de la caja cada mes, como la hoja
// de Excel "Plan de caja". Lógica pura (sin base de datos) para probarla con
// `npm test`; los movimientos los arma getCashPlan() en lib/reports.js.
//
// Cálculo en céntimos enteros para que las sumas no arrastren decimales.

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const INCOME_LINES = [
  { key: 'venta', label: 'Ventas al contado' },
  { key: 'abono', label: 'Cobros de créditos' },
  { key: 'pandero', label: 'Cuotas de pandero' },
  { key: 'aporte', label: 'Dinero que puse' },
];

export const OUTFLOW_LINES = [
  { key: 'compra', label: 'Pago a proveedores' },
  { key: 'comision', label: 'Pago a vendedoras (comisiones)' },
  { key: 'gasto:materiales', label: 'Materiales y empaque' },
  { key: 'gasto:fletes', label: 'Fletes y envíos' },
  { key: 'gasto:publicidad', label: 'Publicidad' },
  { key: 'gasto:movilidad', label: 'Movilidad y delivery' },
  { key: 'gasto:servicios', label: 'Servicios (internet, teléfono…)' },
  { key: 'gasto:local', label: 'Local' },
  { key: 'gasto:otros', label: 'Otros gastos' },
  { key: 'deuda', label: 'Pago de deudas y préstamos' },
  { key: 'impuestos', label: 'Pago de impuestos' },
  { key: 'reserva', label: 'Reserva y ahorro' },
  { key: 'retiro', label: 'Mi sueldo como empresario' },
];

const cents = (value) => Math.round(Number(value || 0) * 100);
const soles = (value) => value / 100;

/**
 * Fila del plan a la que va un movimiento del libro de caja.
 * `src` y `sub` vienen de getCashPlan(): sub es la categoría del gasto, la
 * categoría del Reparto o el sobre usado.
 */
export function planLineOf(src, sub) {
  if (src === 'gasto') {
    const key = `gasto:${sub || 'otros'}`;
    return OUTFLOW_LINES.some((l) => l.key === key) ? key : 'gasto:otros';
  }
  if (src === 'reparto') {
    if (sub === 'impuestos') return 'impuestos';
    if (sub === 'deuda') return 'deuda';
    return 'reserva';
  }
  if (src === 'sobre') return sub === 'impuestos' ? 'impuestos' : 'reserva';
  return src;
}

/**
 * Arma el plan de un año.
 * - rows: [{ month: 1..12, src, sub, amount }] con los movimientos del año.
 * - opening: saldo de caja al 1 de enero (todo lo anterior).
 * - lastMonth: último mes con datos (1..12); los siguientes quedan vacíos (null).
 */
export function buildCashPlan({ rows, opening = 0, lastMonth = 12 }) {
  const lines = new Map([...INCOME_LINES, ...OUTFLOW_LINES].map((l) => [l.key, Array(12).fill(0)]));
  for (const row of rows) {
    const key = planLineOf(row.src, row.sub);
    const month = Number(row.month) - 1;
    if (!lines.has(key) || month < 0 || month > 11) continue;
    lines.get(key)[month] += cents(row.amount);
  }

  const shown = (i) => i < lastMonth;
  const toRow = (line) => {
    const values = lines.get(line.key);
    const total = values.reduce((sum, v, i) => (shown(i) ? sum + v : sum), 0);
    return {
      ...line,
      values: values.map((v, i) => (shown(i) ? soles(v) : null)),
      total: soles(total),
    };
  };
  const income = INCOME_LINES.map(toRow);
  const outflow = OUTFLOW_LINES.map(toRow);

  // Mes a mes: saldo anterior + ingresos − egresos = saldo del mes, que pasa al siguiente.
  const openingByMonth = [];
  const incomeByMonth = [];
  const outflowByMonth = [];
  const closingByMonth = [];
  let balance = cents(opening);
  for (let i = 0; i < 12; i += 1) {
    if (!shown(i)) {
      openingByMonth.push(null);
      incomeByMonth.push(null);
      outflowByMonth.push(null);
      closingByMonth.push(null);
      continue;
    }
    const inc = INCOME_LINES.reduce((sum, l) => sum + lines.get(l.key)[i], 0);
    const out = OUTFLOW_LINES.reduce((sum, l) => sum + lines.get(l.key)[i], 0);
    openingByMonth.push(soles(balance));
    incomeByMonth.push(soles(balance + inc));
    outflowByMonth.push(soles(out));
    balance += inc - out;
    closingByMonth.push(soles(balance));
  }

  const incomeTotal = income.reduce((sum, l) => sum + cents(l.total), 0);
  const outflowTotal = outflow.reduce((sum, l) => sum + cents(l.total), 0);
  return {
    income,
    // Solo las filas de egreso que tuvieron movimiento, para que la tabla no
    // se llene de ceros; las de ingreso se muestran siempre.
    outflow: outflow.filter((l) => l.total !== 0),
    opening: openingByMonth,
    incomeTotals: incomeByMonth,
    outflowTotals: outflowByMonth,
    closing: closingByMonth,
    totals: {
      opening: soles(cents(opening)),
      income: soles(cents(opening) + incomeTotal),
      outflow: soles(outflowTotal),
      closing: soles(balance),
    },
  };
}
