// Comprobante con descuento: cada perfume con su precio normal y su propio
// descuento, el total a pagar y cuánto se ahorra el cliente. Se calcula en
// céntimos enteros para que cuadre al céntimo.
import { formatSoles } from './money.mjs';

/** Cómo se escribe el descuento de cada perfume (por unidad). */
export const DISCOUNT_MODES = [
  { key: 'soles', label: 'S/', hint: 'Soles menos', help: 'Escribe cuántos soles menos le cobras por cada perfume.' },
  { key: 'percent', label: '%', hint: 'Porcentaje', help: 'Escribe el porcentaje de descuento de cada perfume.' },
  { key: 'total', label: 'Precio final', hint: '«Te lo dejo en…»', help: 'Escribe en cuánto le dejas cada perfume.' },
];

const toCents = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

const isBlank = (value) => value == null || String(value).trim() === '';

/** Precio y descuento de una unidad, en céntimos. Vacío = sin descuento. */
function discountCents(unitPrice, value, mode) {
  const price = Math.max(toCents(unitPrice), 0);
  if (isBlank(value) || price <= 0) return { price, off: 0, warning: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return { price, off: 0, warning: 'Escribe un número válido.' };
  if (mode === 'percent') {
    return { price, off: Math.round((price * Math.min(n, 100)) / 100), warning: n > 100 ? 'No puede pasar del 100%.' : null };
  }
  if (mode === 'total') {
    const final = toCents(n);
    return final > price
      ? { price, off: 0, warning: 'Es mayor que el precio normal: no hay descuento.' }
      : { price, off: price - final, warning: null };
  }
  const off = toCents(n);
  return off > price ? { price, off: price, warning: 'Es mayor que el precio normal.' } : { price, off, warning: null };
}

/**
 * El descuento de un perfume, por unidad. `value` se lee según `mode`: soles
 * menos, porcentaje o el precio final acordado. `warning` avisa si se ajustó.
 */
export function unitDiscount(unitPrice, value, mode = 'soles') {
  const { price, off, warning } = discountCents(unitPrice, value, mode);
  return { unitPrice: price / 100, discount: off / 100, finalPrice: (price - off) / 100, ratio: price ? off / price : 0, warning };
}

/**
 * Totales del comprobante. `lines`: [{ name, quantity, unitPrice, discount }]
 * (se ignoran las que no tienen nombre, cantidad o precio). Montos en soles.
 */
export function receiptTotals(lines, mode = 'soles') {
  const items = [];
  for (const l of lines || []) {
    const name = String(l.name || '').trim();
    const quantity = Math.floor(Number(l.quantity) || 0);
    const { price, off } = discountCents(l.unitPrice, l.discount, mode);
    if (name && quantity > 0 && price > 0) items.push({ name, quantity, price, off });
  }
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const discount = items.reduce((sum, i) => sum + i.quantity * i.off, 0);

  return {
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.price / 100,
      unitDiscount: i.off / 100,
      finalPrice: (i.price - i.off) / 100,
      amount: (i.quantity * (i.price - i.off)) / 100,
      ratio: i.off / i.price,
    })),
    units: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: subtotal / 100,
    discount: discount / 100,
    total: (subtotal - discount) / 100,
    ratio: subtotal ? discount / subtotal : 0,
  };
}

/** 0.1 → "10%", 0.0914 → "9.1%". */
export function percentLabel(ratio) {
  const value = Math.round((Number(ratio) || 0) * 1000) / 10;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** Número del comprobante con la fecha y hora de Lima: "20261114-1532". */
export function receiptNumber(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(date))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`;
}

/** "51994379917" → "+51 994 379 917". */
export function phoneLabel(number) {
  const local = String(number).replace(/^51/, '');
  return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Una línea del texto: "• Hawas Ice × 2 — S/ 189.00 → S/ 170.00 c/u (−S/ 19.00 c/u) = S/ 340.00". */
function itemText(i) {
  const each = i.quantity > 1 ? ' c/u' : '';
  const name = i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name;
  const price = i.unitDiscount > 0
    ? `${formatSoles(i.unitPrice)} → ${formatSoles(i.finalPrice)}${each} (${formatSoles(-i.unitDiscount)}${each})`
    : `${formatSoles(i.unitPrice)}${each}`;
  return `• ${name} — ${price}${i.quantity > 1 ? ` = ${formatSoles(i.amount)}` : ''}`;
}

/** El comprobante como texto para WhatsApp (con *negritas*). */
export function receiptText(totals, { number, dateLabel, customer, note, whatsapp, site }) {
  const lines = ['*Comprobante de compra · Alvian Fragancias*', `N.° ${number} · ${dateLabel}`];
  if (customer) lines.push(`Cliente: ${customer}`);
  lines.push('', ...totals.items.map(itemText), '');
  if (totals.discount > 0) {
    lines.push(`Precio normal: ${formatSoles(totals.subtotal)}`);
    lines.push(`Descuento (${percentLabel(totals.ratio)}): ${formatSoles(-totals.discount)}`);
    lines.push(`*Total a pagar: ${formatSoles(totals.total)}*`);
    lines.push(`*¡Te ahorras ${formatSoles(totals.discount)}!*`);
  } else {
    lines.push(`*Total a pagar: ${formatSoles(totals.total)}*`);
  }
  if (note) lines.push('', note);
  lines.push('', '¡Gracias por tu compra!', `WhatsApp ${phoneLabel(whatsapp)} · ${site}`);
  return lines.join('\n');
}
