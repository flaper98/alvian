// Precios automáticos. El precio de venta sale del costo y del margen limpio
// que quieres ganar: lo que te queda después del costo, la comisión de la
// vendedora y el impuesto, dividido entre el precio. Es el mismo "Margen" de
// Distribución, Plan y Resumen. Lógica pura (sin base de datos) para poder
// probarla con `npm test`.
//
//   precio × (1 − comisión% − impuesto% − margen%) = costo

export const PRICE_ROUNDINGS = {
  nueve: 'Terminado en 9 (S/ 189)',
  cinco: 'Múltiplo de 5 (S/ 185)',
  diez: 'Múltiplo de 10 (S/ 190)',
  sol: 'Al sol (S/ 184)',
};

export const MAX_MARGIN_PERCENT = 80;

// "auto" empieza apagado: ningún precio cambia solo hasta que guardes tu regla.
export const DEFAULT_PRICING_CONFIG = Object.freeze({ marginPercent: 50, rounding: 'nueve', auto: false });

/** Valida y normaliza la regla de precios. Lanza un Error con un mensaje claro. */
export function normalizePricingConfig(input = {}) {
  const config = { ...DEFAULT_PRICING_CONFIG };
  if (input.marginPercent !== undefined && input.marginPercent !== null && input.marginPercent !== '') {
    const value = Number(input.marginPercent);
    if (!Number.isFinite(value) || value < 0 || value > MAX_MARGIN_PERCENT) {
      throw new Error(`El margen debe estar entre 0% y ${MAX_MARGIN_PERCENT}%.`);
    }
    config.marginPercent = Math.round(value * 10) / 10;
  }
  if (input.rounding !== undefined && input.rounding !== null) {
    if (!PRICE_ROUNDINGS[input.rounding]) throw new Error('Elige cómo redondear los precios.');
    config.rounding = input.rounding;
  }
  if (input.auto !== undefined) config.auto = Boolean(input.auto);
  return config;
}

/**
 * Redondea un precio siempre HACIA ARRIBA (para no quedar por debajo del margen):
 * "nueve" → termina en 9 (183.20 → 189), "cinco" → 185, "diez" → 190, "sol" → 184.
 */
export function roundPrice(value, rounding = 'nueve') {
  // Primero a céntimos, para que 199.99999999999997 no salte a 201.
  const n = Math.ceil(Math.round(Number(value) * 100) / 100);
  if (!(n > 0)) return 0;
  if (rounding === 'nueve') return n + ((19 - (n % 10)) % 10);
  if (rounding === 'cinco') return Math.ceil(n / 5) * 5;
  if (rounding === 'diez') return Math.ceil(n / 10) * 10;
  return n;
}

/** Margen limpio de un precio, en %: (precio − costo − comisión − impuesto) ÷ precio. */
export function netMargin(price, cost, { commissionPercent = 0, taxPercent = 0 } = {}) {
  const p = Number(price);
  if (!(p > 0) || cost == null) return null;
  const net = p - Number(cost) - (p * (Number(commissionPercent) + Number(taxPercent))) / 100;
  return Math.round((net / p) * 1000) / 10;
}

/** Cuántas veces el costo hay que cobrar para ese margen (2.5 = 2.5 × costo). null si es imposible. */
export function priceMultiplier({ marginPercent, commissionPercent = 0, taxPercent = 0 }) {
  const keep = 1 - (Number(marginPercent) + Number(commissionPercent) + Number(taxPercent)) / 100;
  return keep > 0 ? 1 / keep : null;
}

/**
 * Precio sugerido: el menor precio redondeado con el que te queda `marginPercent`%
 * limpio. null si no hay costo o si margen + comisión + impuesto llegan al 100%.
 */
export function suggestPrice(cost, { marginPercent, commissionPercent = 0, taxPercent = 0, rounding = 'nueve' }) {
  const c = Number(cost);
  const multiplier = priceMultiplier({ marginPercent, commissionPercent, taxPercent });
  if (cost == null || !(c > 0) || multiplier == null) return null;
  return roundPrice(c * multiplier, rounding);
}

/**
 * Al cambiar el precio, el precio "antes" (tachado en la tienda) se ajusta para
 * mantener el mismo % de descuento. Si no había descuento activo, no se toca.
 */
export function scaleComparePrice(comparePrice, oldPrice, newPrice, rounding = 'nueve') {
  const compare = Number(comparePrice);
  const old = Number(oldPrice);
  if (comparePrice == null || !(old > 0) || !(compare > old)) return comparePrice ?? null;
  return roundPrice((Number(newPrice) * compare) / old, rounding);
}

/**
 * Precio sugerido para cada perfume según la regla. `items`: { id, price, cost,
 * locked, ... } (cost null si no hay compra ni precio de proveedor). status:
 * - "subir": su precio está por debajo de tu margen.
 * - "ok": ya cumple (nunca se baja un precio solo).
 * - "fijo": lo fijaste a mano; la automatización no lo toca.
 * - "sin-costo": no se puede calcular. "imposible": margen + comisión ≥ 100%.
 */
export function planPrices(items, config, rates = {}) {
  const rule = { ...rates, marginPercent: config.marginPercent, rounding: config.rounding };
  return items.map((item) => {
    const price = Number(item.price) || 0;
    const suggested = suggestPrice(item.cost, rule);
    let status = 'ok';
    if (item.cost == null || !(Number(item.cost) > 0)) status = 'sin-costo';
    else if (suggested == null) status = 'imposible';
    else if (item.locked) status = 'fijo';
    else if (price < suggested) status = 'subir';
    return {
      ...item,
      price,
      suggested,
      status,
      marginNow: netMargin(price, item.cost, rates),
      marginNew: suggested == null ? null : netMargin(suggested, item.cost, rates),
    };
  });
}
