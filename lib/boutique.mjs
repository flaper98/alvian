// Venta en una boutique a consignación: la boutique cobra un % de cada venta.
// El precio en la boutique es tu precio de la web más un aumento (por defecto,
// el mismo % de su comisión): tu margen ya está en el precio web.
//
//   precio boutique = precio web × (1 + aumento%)   (redondeado hacia arriba)
//
// Lógica pura (sin base de datos) para poder probarla con `npm test`.
import { roundPrice } from './pricing.mjs';

// `sedes`: los locales de la boutique. Cada movimiento guarda el número de su
// sede (1, 2…), así se puede cambiar el nombre sin perder nada.
// `markupPercent`: cuánto más que en la web cuesta en la boutique (si no se
// guardó, es igual a la comisión).
export const DEFAULT_BOUTIQUE_CONFIG = Object.freeze({
  name: 'Boutique',
  feePercent: 25,
  markupPercent: null,
  sedes: Object.freeze(['Sede 1', 'Sede 2']),
});

const MAX_MARKUP_PERCENT = 200;

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
  const percent = (key, max, message) => {
    if (input[key] === undefined || input[key] === null || input[key] === '') return;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > max) throw new Error(message);
    config[key] = Math.round(value * 10) / 10;
  };
  percent('feePercent', 90, 'La comisión de la boutique debe estar entre 0% y 90%.');
  percent('markupPercent', MAX_MARKUP_PERCENT, `El aumento sobre la web debe estar entre 0% y ${MAX_MARKUP_PERCENT}%.`);
  // Sin aumento guardado: el mismo % que cobra la boutique.
  if (config.markupPercent == null) config.markupPercent = config.feePercent;
  return config;
}

/** Precio en la boutique: tu precio web más el aumento, redondeado hacia arriba como tus precios. */
export function boutiquePrice(webPrice, { markupPercent, rounding = 'nueve' }) {
  const web = Number(webPrice);
  if (!(web > 0)) return null;
  return roundPrice(web * (1 + (Number(markupPercent) || 0) / 100), rounding);
}

/**
 * Aumento sobre la web que hace falta para que la boutique, después de su
 * comisión, te pague lo mismo que cobras en la web: 20% de comisión → 25%.
 */
export function breakEvenMarkup(feePercent) {
  const fee = Number(feePercent) || 0;
  if (fee >= 100) return null;
  return Math.round((fee / (100 - fee)) * 1000) / 10;
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

/**
 * Las letras de cada sede para su código: las 3 primeras de su nombre
 * ("Amazonas" → "AMA"). Si dos sedes empiezan igual (o el nombre tiene menos
 * de 3 letras), 2 letras + su número: "Sede 1" y "Sede 2" → "SE1" y "SE2".
 */
export function sedeCodes(config) {
  const letters = config.sedes.map((name) =>
    String(name)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z]/g, ''),
  );
  const three = letters.map((l) => l.slice(0, 3));
  return three.map((code, i) =>
    code.length < 3 || three.indexOf(code) !== three.lastIndexOf(code) ? `${letters[i].slice(0, 2)}${i + 1}` : code,
  );
}

/** Código del perfume en una sede: el del perfume + las letras de la sede ("ALV001-AMA"). */
export function sedeProductCode(code, config, sede) {
  if (!code) return '';
  const tag = sedeCodes(config)[Number(sede) - 1];
  return tag ? `${code}-${tag}` : code;
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
    columns: [{ width: 11 }, { width: 14 }, { width: 38 }, { width: 12 }, { width: 11 }],
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
