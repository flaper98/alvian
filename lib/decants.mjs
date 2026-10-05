// Decants: perfume fraccionado en frasquitos de 3, 5 y 10 ml. Al "abrir un
// frasco" sus ml pasan a la reserva de decants del perfume, con su costo por
// ml. Cada decant cuesta: ml × costo por ml + envase (frasco con atomizador y
// etiqueta), y su precio sale de ese costo con el margen limpio de decants
// (lib/pricing.mjs). Lógica pura para probarla con `npm test`.
import { fromCents, toCents } from './distribucion.mjs';
import { MAX_MARGIN_PERCENT, suggestPrice } from './pricing.mjs';

export const DEFAULT_DECANT_CONFIG = Object.freeze({
  // Envase = frasquito con atomizador + etiqueta (S/ 3 a 5).
  sizes: [
    { ml: 3, packaging: 3 },
    { ml: 5, packaging: 4 },
    { ml: 10, packaging: 5 },
  ],
  marginPercent: 60,
});

export const DEFAULT_BOTTLE_ML = 100;

/** Valida y normaliza la configuración de decants. Lanza un Error con un mensaje claro. */
export function normalizeDecantConfig(input = {}) {
  const config = { sizes: DEFAULT_DECANT_CONFIG.sizes.map((s) => ({ ...s })), marginPercent: DEFAULT_DECANT_CONFIG.marginPercent };
  if (Array.isArray(input.sizes)) {
    const sizes = input.sizes
      .map((s) => ({ ml: Number(s?.ml), packaging: Number(s?.packaging) }))
      .filter((s) => Number.isFinite(s.ml) && s.ml > 0);
    for (const s of sizes) {
      if (s.ml > 100) throw new Error('Un decant no puede tener más de 100 ml.');
      if (!Number.isFinite(s.packaging) || s.packaging < 0) throw new Error(`Revisa el costo del envase de ${s.ml} ml.`);
    }
    const unique = new Map(sizes.map((s) => [Math.round(s.ml * 10) / 10, Math.round(s.packaging * 100) / 100]));
    if (unique.size === 0) throw new Error('Agrega al menos un tamaño de decant.');
    config.sizes = [...unique].map(([ml, packaging]) => ({ ml, packaging })).sort((a, b) => a.ml - b.ml);
  }
  if (input.marginPercent !== undefined && input.marginPercent !== null && input.marginPercent !== '') {
    const value = Number(input.marginPercent);
    if (!Number.isFinite(value) || value < 0 || value > MAX_MARGIN_PERCENT) {
      throw new Error(`El margen de decants debe estar entre 0% y ${MAX_MARGIN_PERCENT}%.`);
    }
    config.marginPercent = Math.round(value * 10) / 10;
  }
  return config;
}

/** Costo por ml de un frasco (4 decimales). null si no hay costo o ml. */
export function costPerMl(bottleCost, volumeMl) {
  const cost = Number(bottleCost);
  const ml = Number(volumeMl);
  if (bottleCost == null || !(cost > 0) || !(ml > 0)) return null;
  return Math.round((cost / ml) * 10000) / 10000;
}

/** Costo de un decant: ml × costo por ml + envase. null si no se conoce el costo por ml. */
export function decantUnitCost(ml, perMl, packaging = 0) {
  if (perMl == null) return null;
  return fromCents(toCents(Number(ml) * Number(perMl)) + toCents(packaging));
}

/**
 * Precio de cada tamaño: el costo del decant con el margen limpio de decants
 * (descontando comisión e impuesto) y el redondeo de tu regla de precios.
 * Devuelve [{ ml, packaging, cost, price }] (price null si no hay costo).
 */
export function decantPrices(perMl, config, { commissionPercent = 0, taxPercent = 0, rounding = 'nueve' } = {}) {
  return config.sizes.map((size) => {
    const cost = decantUnitCost(size.ml, perMl, size.packaging);
    return {
      ml: size.ml,
      packaging: size.packaging,
      cost,
      price:
        cost == null
          ? null
          : suggestPrice(cost, { marginPercent: config.marginPercent, commissionPercent, taxPercent, rounding }),
    };
  });
}

/**
 * Al abrir un frasco: sus ml se suman a la reserva de decants y el costo por
 * ml queda como el promedio ponderado entre lo que había y el frasco nuevo.
 */
export function openBottle({ poolMl = 0, poolPerMl = null, bottleMl, bottleCost }) {
  const added = Number(bottleMl);
  const cost = Number(bottleCost);
  if (!(added > 0)) throw new Error('El frasco no tiene ml registrados.');
  if (bottleCost == null || !(cost > 0)) throw new Error('Este perfume no tiene costo: registra su compra primero.');
  const current = Math.max(Number(poolMl) || 0, 0);
  const currentValue = poolPerMl == null ? 0 : current * Number(poolPerMl);
  const ml = Math.round((current + added) * 100) / 100;
  return { ml, perMl: Math.round(((currentValue + cost) / (current + added)) * 10000) / 10000 };
}

/** Nombre de la línea en pedidos y ventas: "Khamrah · Decant 10 ml". */
export function decantName(name, ml) {
  return `${name} · Decant ${Number(ml)} ml`;
}
