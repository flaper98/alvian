// Cómo se elige el precio de un proveedor para un perfume. Lo usan la
// comparación de precios (navegador) y el alta masiva al catálogo (servidor),
// para que lo que se ve en la vista previa sea exactamente lo que se guarda.

// Niveles de precio por unidad (menudeo): no cuentan como precio por mayor.
const RETAIL_TIER = /unidad|unitario|menudeo|\bunit\b|x ?1\b/i;
const ENTRY_LABEL = /mayor/i;

/**
 * Precio de UN proveedor para un perfume, entre sus niveles (`options`):
 * - "mayor": el nivel por mayor de entrada = el más caro de sus niveles por
 *   mayor (el de menos volumen: "Por mayor", "6 a 11"…), sin contar "Unidad".
 *   Ante un empate de precio se prefiere el nivel llamado "Por mayor".
 * - "volumen": su precio más bajo, en cualquier nivel (5K, 30K, 12+…).
 * Cada opción es { price, tierLabel, ... }. Devuelve null si no hay opción válida.
 */
export function pickSupplierOption(options, mode = 'mayor') {
  if (!options?.length) return null;
  if (mode === 'volumen') {
    return options.reduce((min, opt) => (Number(opt.price) < Number(min.price) ? opt : min));
  }
  const wholesale = options.filter((opt) => !RETAIL_TIER.test(opt.tierLabel));
  if (wholesale.length === 0) return null;
  return wholesale.reduce((best, opt) => {
    const diff = Number(opt.price) - Number(best.price);
    if (diff > 0) return opt;
    if (diff === 0 && ENTRY_LABEL.test(opt.tierLabel) && !ENTRY_LABEL.test(best.tierLabel)) return opt;
    return best;
  });
}

/**
 * Mejor precio por mayor de un perfume entre todos los proveedores: el precio
 * por mayor de entrada de cada uno y, de esos, el más barato.
 * `options` = todas las filas del perfume ({ supplierId, supplierName, price, tierLabel }).
 */
export function bestWholesaleOption(options, mode = 'mayor') {
  const bySupplier = new Map();
  for (const option of options) {
    const list = bySupplier.get(option.supplierId) || [];
    list.push(option);
    bySupplier.set(option.supplierId, list);
  }
  let best = null;
  for (const list of bySupplier.values()) {
    const picked = pickSupplierOption(list, mode);
    if (picked && (!best || Number(picked.price) < Number(best.price))) best = picked;
  }
  return best;
}

/** "SWEET FANTASY ZAKAT" → "Sweet Fantasy Zakat"; un nombre con mayúsculas y minúsculas queda igual. */
export function catalogName(name) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim();
  if (clean !== clean.toUpperCase()) return clean;
  return clean.toLowerCase().replace(/(^|\s)(\S)/g, (match, space, letter) => space + letter.toUpperCase());
}

/** Precio de venta = costo + ganancia, redondeado a céntimos. */
export function salePrice(cost, margin) {
  return Math.round((Number(cost) + Number(margin)) * 100) / 100;
}
