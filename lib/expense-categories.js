// Categorías de los gastos del negocio (lo que no es compra de perfumes,
// comisión, retiro ni pago de deuda: eso tiene su propia sección).
export const EXPENSE_CATEGORIES = [
  { key: 'materiales', label: 'Materiales y empaque', hint: 'Bolsas, cajas, stickers, tarjetas' },
  { key: 'fletes', label: 'Fletes y envíos', hint: 'Shalom, Olva, flete de la mercadería' },
  { key: 'publicidad', label: 'Publicidad', hint: 'Facebook, Instagram, TikTok, Google' },
  { key: 'movilidad', label: 'Movilidad y delivery', hint: 'Mototaxi, pasajes, delivery' },
  { key: 'servicios', label: 'Servicios', hint: 'Internet, teléfono, luz, plataformas' },
  { key: 'local', label: 'Local', hint: 'Alquiler, mantenimiento' },
  { key: 'otros', label: 'Otros', hint: '' },
];

export const EXPENSE_CATEGORY_KEYS = EXPENSE_CATEGORIES.map((c) => c.key);

export function expenseCategoryLabel(key) {
  return EXPENSE_CATEGORIES.find((c) => c.key === key)?.label || 'Otros';
}

// Para clasificar gastos antiguos (o sugerir una categoría) según la descripción.
const KEYWORDS = [
  ['fletes', /flete|env[ií]o|shalom|olva|courier|encomienda|cargo|agencia/i],
  ['materiales', /bolsa|caja|empaque|embalaje|sticker|etiqueta|tarjeta|cinta|papel|lazo|material|muestra|decant|atomizador/i],
  ['publicidad', /publicidad|anuncio|facebook|instagram|tiktok|meta|google|ads|promoci|influencer|volante|banner/i],
  ['movilidad', /movilidad|mototaxi|taxi|pasaje|delivery|gasolina|combustible|transporte/i],
  ['servicios', /internet|tel[eé]fono|celular|recarga|luz|agua|hosting|dominio|plataforma|vercel|suscripci/i],
  ['local', /alquiler|local|renta|mantenimiento/i],
];

export function guessExpenseCategory(description) {
  const text = String(description || '');
  return KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] || 'otros';
}
