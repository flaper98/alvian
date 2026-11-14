import test from 'node:test';
import assert from 'node:assert/strict';
import { percentLabel, phoneLabel, receiptNumber, receiptText, receiptTotals } from '../lib/receipt.mjs';

const LINES = [
  { name: 'Hawas Ice', quantity: 2, unitPrice: 189 },
  { name: 'Mandarin Sky', quantity: 1, unitPrice: '169' },
];

test('sin descuento: el total es el precio normal', () => {
  const t = receiptTotals(LINES);
  assert.equal(t.subtotal, 547);
  assert.equal(t.discount, 0);
  assert.equal(t.total, 547);
  assert.equal(t.units, 3);
  assert.deepEqual(t.items[0], { name: 'Hawas Ice', quantity: 2, unitPrice: 189, amount: 378 });
  assert.equal(t.warning, null);
});

test('descuento en soles, en % y con precio final', () => {
  const soles = receiptTotals(LINES, { mode: 'soles', value: '47' });
  assert.deepEqual([soles.discount, soles.total], [47, 500]);

  const percent = receiptTotals(LINES, { mode: 'percent', value: 10 });
  assert.deepEqual([percent.discount, percent.total], [54.7, 492.3]);
  assert.equal(percentLabel(percent.ratio), '10%');

  const final = receiptTotals(LINES, { mode: 'total', value: '480' });
  assert.deepEqual([final.discount, final.total], [67, 480]);
  assert.equal(percentLabel(final.ratio), '12.2%');
});

test('los céntimos cuadran', () => {
  const t = receiptTotals([{ name: 'Decant', quantity: 3, unitPrice: 19.99 }], { mode: 'percent', value: 7.5 });
  assert.equal(t.subtotal, 59.97);
  assert.equal(t.discount, 4.5);
  assert.equal(t.total, 55.47);
});

test('descuentos fuera de rango se ajustan y avisan', () => {
  const tooMuch = receiptTotals(LINES, { mode: 'soles', value: 600 });
  assert.equal(tooMuch.total, 0);
  assert.match(tooMuch.warning, /no puede ser mayor/);

  const over100 = receiptTotals(LINES, { mode: 'percent', value: 120 });
  assert.equal(over100.total, 0);
  assert.match(over100.warning, /100%/);

  const higher = receiptTotals(LINES, { mode: 'total', value: 600 });
  assert.equal(higher.discount, 0);
  assert.match(higher.warning, /mayor que el precio normal/);

  assert.match(receiptTotals(LINES, { mode: 'soles', value: '-5' }).warning, /número válido/);
  // Campo vacío: sin descuento ni aviso (también en «precio final»).
  assert.equal(receiptTotals(LINES, { mode: 'total', value: '' }).total, 547);
});

test('se ignoran las líneas incompletas', () => {
  const t = receiptTotals([...LINES, { name: '', quantity: 1, unitPrice: 50 }, { name: 'Sin precio', quantity: 1, unitPrice: '' }]);
  assert.equal(t.items.length, 2);
  assert.equal(t.subtotal, 547);
});

test('número, teléfono y texto para WhatsApp', () => {
  // 20:32 UTC = 15:32 en Lima.
  assert.equal(receiptNumber('2026-11-14T20:32:00Z'), '20261114-1532');
  assert.equal(phoneLabel('51994379917'), '+51 994 379 917');

  const text = receiptText(receiptTotals(LINES, { mode: 'total', value: 480 }), {
    number: '20261114-1532',
    dateLabel: '14 de noviembre de 2026',
    customer: 'Rosa',
    note: 'Entrega el sábado',
    whatsapp: '51994379917',
    site: 'alvianfragancias.com',
  });
  assert.match(text, /Cliente: Rosa/);
  assert.match(text, /• Hawas Ice × 2 — S\/ 189\.00 c\/u = S\/ 378\.00/);
  assert.match(text, /• Mandarin Sky — S\/ 169\.00/);
  assert.match(text, /Precio normal: S\/ 547\.00/);
  assert.match(text, /Descuento \(12\.2%\): −S\/ 67\.00/);
  assert.match(text, /\*Total a pagar: S\/ 480\.00\*/);
  assert.match(text, /\*¡Te ahorras S\/ 67\.00!\*/);
  assert.match(text, /Entrega el sábado/);

  const plain = receiptText(receiptTotals(LINES), { number: '1', dateLabel: 'hoy', whatsapp: '51994379917', site: 'x' });
  assert.doesNotMatch(plain, /Descuento|ahorras|Cliente/);
});
