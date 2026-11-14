// Comprobante con descuento: precio normal, descuento, total a pagar y cuánto
// se ahorra el cliente. Se calcula en céntimos enteros para que cuadre al céntimo.
import { formatSoles } from './money.mjs';

/** Formas de dar el descuento: un monto, un porcentaje o el precio final acordado. */
export const DISCOUNT_MODES = [
  { key: 'soles', label: 'S/', hint: 'Monto de descuento', input: '¿Cuánto le descuentas? (S/)' },
  { key: 'percent', label: '%', hint: 'Porcentaje', input: '¿Qué porcentaje le descuentas? (%)' },
  { key: 'total', label: 'Precio final', hint: '«Te lo dejo en…»', input: '¿En cuánto se lo dejas en total? (S/)' },
];

const toCents = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

const isBlank = (value) => value == null || String(value).trim() === '';

/**
 * Totales del comprobante. `lines`: [{ name, quantity, unitPrice }] (se ignoran
 * las que no tienen nombre, cantidad o precio). `discount`: { mode, value }.
 * Los montos salen en soles; `warning` explica si el descuento se tuvo que ajustar.
 */
export function receiptTotals(lines, { mode = 'soles', value = '' } = {}) {
  const items = (lines || [])
    .map((l) => ({
      name: String(l.name || '').trim(),
      quantity: Math.floor(Number(l.quantity) || 0),
      priceCents: toCents(l.unitPrice),
    }))
    .filter((l) => l.name && l.quantity > 0 && l.priceCents > 0);
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.priceCents, 0);

  let off = 0;
  let warning = null;
  if (!isBlank(value) && subtotal > 0) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      warning = 'Escribe un número válido.';
    } else if (mode === 'percent') {
      if (n > 100) warning = 'El descuento no puede pasar del 100%.';
      off = Math.round((subtotal * Math.min(n, 100)) / 100);
    } else if (mode === 'total') {
      const final = toCents(n);
      if (final > subtotal) warning = 'El precio final es mayor que el precio normal: no hay descuento.';
      off = Math.max(subtotal - final, 0);
    } else {
      off = toCents(n);
      if (off > subtotal) {
        warning = 'El descuento no puede ser mayor que el precio normal.';
        off = subtotal;
      }
    }
  }

  return {
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.priceCents / 100,
      amount: (i.quantity * i.priceCents) / 100,
    })),
    units: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: subtotal / 100,
    discount: off / 100,
    total: (subtotal - off) / 100,
    ratio: subtotal ? off / subtotal : 0,
    warning,
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

/** El comprobante como texto para WhatsApp (con *negritas*). */
export function receiptText(totals, { number, dateLabel, customer, note, whatsapp, site }) {
  const lines = ['*Comprobante de compra · Alvian Fragancias*', `N.° ${number} · ${dateLabel}`];
  if (customer) lines.push(`Cliente: ${customer}`);
  lines.push('');
  for (const i of totals.items) {
    lines.push(
      i.quantity > 1
        ? `• ${i.name} × ${i.quantity} — ${formatSoles(i.unitPrice)} c/u = ${formatSoles(i.amount)}`
        : `• ${i.name} — ${formatSoles(i.amount)}`,
    );
  }
  lines.push('');
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
