// Venta en una boutique a consignación: la boutique cobra un % de cada venta.
// Para ganar lo mismo que en la web, el precio en la boutique tiene que cubrir
// su comisión además de tu margen:
//
//   precio × (1 − comisión boutique% − impuesto% − tu margen%) = costo
//
// Lógica pura (sin base de datos) para poder probarla con `npm test`.
import { suggestPrice } from './pricing.mjs';

// `sedes`: los locales de la boutique. Cada movimiento guarda el número de su
// sede (1, 2…), así se puede cambiar el nombre sin perder nada.
export const DEFAULT_BOUTIQUE_CONFIG = Object.freeze({
  name: 'Boutique',
  feePercent: 25,
  marginPercent: 30,
  sedes: Object.freeze(['Sede 1', 'Sede 2']),
});

const cents = (value) => Math.round((Number(value) || 0) * 100);

/** Valida y normaliza los datos de la boutique. Lanza un Error con un mensaje claro. */
export function normalizeBoutiqueConfig(input = {}) {
  const config = { ...DEFAULT_BOUTIQUE_CONFIG, sedes: [...DEFAULT_BOUTIQUE_CONFIG.sedes] };
  if (input.name !== undefined) {
    const name = String(input.name || '').trim().slice(0, 60);
    if (!name) throw new Error('Ponle un nombre a la boutique.');
    config.name = name;
  }
  if (Array.isArray(input.sedes)) {
    const sedes = input.sedes.map((s) => String(s || '').trim().slice(0, 40));
    if (!sedes.length || sedes.some((s) => !s)) throw new Error('Ponle un nombre a cada sede.');
    if (new Set(sedes.map((s) => s.toLowerCase())).size !== sedes.length) throw new Error('Cada sede debe tener un nombre distinto.');
    config.sedes = sedes.slice(0, 5);
  }
  for (const key of ['feePercent', 'marginPercent']) {
    if (input[key] === undefined || input[key] === null || input[key] === '') continue;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > 90) throw new Error('Los porcentajes deben estar entre 0% y 90%.');
    config[key] = Math.round(value * 10) / 10;
  }
  if (config.feePercent + config.marginPercent >= 100) {
    throw new Error('La comisión de la boutique más tu margen deben sumar menos de 100%.');
  }
  return config;
}

/** Precio en la boutique para que te quede `marginPercent`% limpio después de su comisión. */
export function boutiquePrice(cost, { feePercent, marginPercent, taxPercent = 0, rounding = 'nueve' }) {
  return suggestPrice(cost, { marginPercent, commissionPercent: feePercent, taxPercent, rounding });
}

/** Cómo se reparte un precio de la boutique: su comisión, lo que te paga y lo que ganas. */
export function boutiqueSplit(price, cost, { feePercent, taxPercent = 0 }) {
  const p = cents(price);
  const fee = Math.round((p * Number(feePercent)) / 100);
  const tax = Math.round((p * Number(taxPercent)) / 100);
  const profit = cost == null ? null : p - fee - tax - cents(cost);
  return {
    fee: fee / 100,
    youGet: (p - fee) / 100,
    profit: profit == null ? null : profit / 100,
    margin: profit == null || p <= 0 ? null : Math.round((profit / p) * 1000) / 10,
  };
}

/** Nombre de la sede `n` (1, 2…) según los datos de la boutique. */
export function sedeName(config, sede) {
  return config.sedes[Number(sede) - 1] || `Sede ${sede}`;
}

/** ¿Es una sede que existe? (1 … cantidad de sedes) */
export function isValidSede(config, sede) {
  const n = Number(sede);
  return Number.isInteger(n) && n >= 1 && n <= config.sedes.length;
}

// Código de producto para la boutique: ALV001, ALV002… (uno por perfume, para
// siempre, en las dos sedes). Se asigna la primera vez que lo dejas.
const CODE_PREFIX = 'ALV';

/** 1 → "ALV001"; 1234 → "ALV1234". */
export function boutiqueCode(number) {
  return `${CODE_PREFIX}${String(number).padStart(3, '0')}`;
}

/** El siguiente código libre después de los que ya existen. */
export function nextBoutiqueCode(codes) {
  const numbers = codes
    .map((code) => /^ALV(\d+)$/.exec(String(code || ''))?.[1])
    .filter(Boolean)
    .map(Number);
  return boutiqueCode((numbers.length ? Math.max(...numbers) : 0) + 1);
}

/**
 * Unidades en cada sede de la boutique por perfume, según los movimientos
 * ({ perfumeId, sede, kind: 'entrega' | 'devolucion' | 'venta', quantity }).
 */
export function boutiqueStock(moves) {
  const rows = new Map();
  for (const move of moves) {
    const sede = Number(move.sede) || 1;
    const key = `${sede}:${move.perfumeId}`;
    const row = rows.get(key) || { sede, perfumeId: move.perfumeId, delivered: 0, returned: 0, sold: 0 };
    const quantity = Number(move.quantity) || 0;
    if (move.kind === 'entrega') row.delivered += quantity;
    else if (move.kind === 'devolucion') row.returned += quantity;
    else if (move.kind === 'venta') row.sold += quantity;
    rows.set(key, row);
  }
  return [...rows.values()].map((row) => ({ ...row, atBoutique: row.delivered - row.returned - row.sold }));
}

// ---------- Excel de entrega (lo que mandas a cada sede) ----------

const LIMA_OFFSET_MS = 5 * 3600 * 1000;

/** Día de Lima de un instante: "2026-11-18". */
export function limaDay(date) {
  return new Date(new Date(date).getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Las líneas del Excel: lo que dejaste en una sede entre dos días (incluidos),
 * un renglón por día, perfume y precio. `deliveries`: [{ sede, occurredAt,
 * code, name, quantity, unitPrice }].
 */
export function deliveryLines(deliveries, { sede, from, to }) {
  const lines = new Map();
  for (const d of deliveries) {
    const day = limaDay(d.occurredAt);
    if (Number(d.sede) !== Number(sede) || (from && day < from) || (to && day > to)) continue;
    const key = `${day}|${d.code}|${d.name}|${d.unitPrice}`;
    const line = lines.get(key) || { day, code: d.code || '', name: d.name, quantity: 0, unitPrice: Number(d.unitPrice) || 0 };
    line.quantity += Number(d.quantity) || 0;
    lines.set(key, line);
  }
  return [...lines.values()].sort((a, b) => a.day.localeCompare(b.day) || a.code.localeCompare(b.code));
}

/** "2026-11-18" → "18112026", para el nombre del archivo (como MANDI14102026.xlsx). */
export function compactDay(day) {
  const [y, m, d] = day.split('-');
  return `${d}${m}${y}`;
}

const EXCEL_BORDER = { borderStyle: 'thin', borderColor: '#000000' };

/**
 * Hoja de Excel con el formato de las guías de la boutique: FECHA, CODIGO,
 * DESCRIPCION, CANTIDAD y PRECIO, con bordes y encabezado en negrita. Para
 * `write-excel-file` (filas de celdas y anchos de columna).
 */
export function deliverySheet(lines) {
  const header = ['FECHA', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'PRECIO'].map((value) => ({
    value,
    fontWeight: 'bold',
    align: 'center',
    ...EXCEL_BORDER,
  }));
  const rows = lines.map((line) => {
    const [y, m, d] = line.day.split('-').map(Number);
    return [
      { value: new Date(Date.UTC(y, m - 1, d)), type: Date, format: 'dd/mm/yy', align: 'right', ...EXCEL_BORDER },
      { value: line.code, type: String, ...EXCEL_BORDER },
      { value: line.name.toUpperCase(), type: String, ...EXCEL_BORDER },
      { value: line.quantity, type: Number, align: 'right', ...EXCEL_BORDER },
      { value: line.unitPrice, type: Number, align: 'right', ...EXCEL_BORDER },
    ];
  });
  return {
    data: [header, ...rows],
    columns: [{ width: 11 }, { width: 11 }, { width: 38 }, { width: 12 }, { width: 11 }],
  };
}

/**
 * Lo que falta liquidar de una venta de la boutique: el saldo por cobrar y la
 * parte de su comisión que todavía no se descontó. La boutique te paga la diferencia.
 */
export function settlementOf({ total, paid = 0, fee = 0, feeRecorded = 0 }) {
  const balance = Math.max(cents(total) - cents(paid), 0);
  const feeLeft = Math.min(Math.max(cents(fee) - cents(feeRecorded), 0), balance);
  return { balance: balance / 100, fee: feeLeft / 100, cash: (balance - feeLeft) / 100 };
}
