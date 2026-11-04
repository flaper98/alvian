// Venta en una boutique a consignación: la boutique cobra un % de cada venta.
// Para ganar lo mismo que en la web, el precio en la boutique tiene que cubrir
// su comisión además de tu margen:
//
//   precio × (1 − comisión boutique% − impuesto% − tu margen%) = costo
//
// Lógica pura (sin base de datos) para poder probarla con `npm test`.
import { suggestPrice } from './pricing.mjs';

export const DEFAULT_BOUTIQUE_CONFIG = Object.freeze({ name: 'Boutique', feePercent: 25, marginPercent: 30 });

const cents = (value) => Math.round((Number(value) || 0) * 100);

/** Valida y normaliza los datos de la boutique. Lanza un Error con un mensaje claro. */
export function normalizeBoutiqueConfig(input = {}) {
  const config = { ...DEFAULT_BOUTIQUE_CONFIG };
  if (input.name !== undefined) {
    const name = String(input.name || '').trim().slice(0, 60);
    if (!name) throw new Error('Ponle un nombre a la boutique.');
    config.name = name;
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

/**
 * Unidades en la boutique por perfume, según los movimientos
 * ({ perfumeId, kind: 'entrega' | 'devolucion' | 'venta', quantity }).
 */
export function boutiqueStock(moves) {
  const byPerfume = new Map();
  for (const move of moves) {
    const row = byPerfume.get(move.perfumeId) || { perfumeId: move.perfumeId, delivered: 0, returned: 0, sold: 0 };
    const quantity = Number(move.quantity) || 0;
    if (move.kind === 'entrega') row.delivered += quantity;
    else if (move.kind === 'devolucion') row.returned += quantity;
    else if (move.kind === 'venta') row.sold += quantity;
    byPerfume.set(move.perfumeId, row);
  }
  return [...byPerfume.values()].map((row) => ({ ...row, atBoutique: row.delivered - row.returned - row.sold }));
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
