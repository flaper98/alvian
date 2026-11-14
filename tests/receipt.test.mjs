import test from 'node:test';
import assert from 'node:assert/strict';
import { percentLabel, phoneLabel, receiptNumber, receiptText, receiptTotals, unitDiscount } from '../lib/receipt.mjs';

const lines = (a, b) => [
  { name: 'Hawas Ice', quantity: 2, unitPrice: 189, discount: a },
  { name: 'Mandarin Sky', quantity: 1, unitPrice: '169', discount: b },
];

test('sin descuento: el total es el precio normal', () => {
  const t = receiptTotals(lines('', ''));
  assert.deepEqual([t.subtotal, t.discount, t.total, t.units], [547, 0, 547, 3]);
  assert.deepEqual(t.items[0], {
    name: 'Hawas Ice',
    quantity: 2,
    unitPrice: 189,
    unitDiscount: 0,
    finalPrice: 189,
    amount: 378,
    ratio: 0,
  });
});

test('cada perfume con su propio descuento, por unidad', () => {
  // Soles menos: 19 a cada Hawas Ice y nada al Mandarin Sky.
  const soles = receiptTotals(lines('19', ''), 'soles');
  assert.deepEqual(soles.items.map((i) => [i.finalPrice, i.amount]), [[170, 340], [169, 169]]);
  assert.deepEqual([soles.subtotal, soles.discount, soles.total], [547, 38, 509]);

  // Porcentaje distinto en cada uno.
  const percent = receiptTotals(lines(10, 5), 'percent');
  assert.deepEqual(percent.items.map((i) => i.unitDiscount), [18.9, 8.45]);
  assert.deepEqual([percent.discount, percent.total], [46.25, 500.75]);

  // Precio final: «te lo dejo en 170 y en 150».
  const final = receiptTotals(lines('170', '150'), 'total');
  assert.deepEqual([final.discount, final.total], [57, 490]);
  assert.equal(percentLabel(final.ratio), '10.4%');
  assert.equal(percentLabel(final.items[0].ratio), '10.1%');
});

test('el descuento de un perfume se ajusta y avisa si no tiene sentido', () => {
  assert.deepEqual(unitDiscount(169, '200', 'soles'), {
    unitPrice: 169,
    discount: 169,
    finalPrice: 0,
    ratio: 1,
    warning: 'Es mayor que el precio normal.',
  });
  assert.match(unitDiscount(169, 120, 'percent').warning, /100%/);
  const higher = unitDiscount(169, 180, 'total');
  assert.equal(higher.discount, 0);
  assert.match(higher.warning, /mayor que el precio normal/);
  assert.match(unitDiscount(169, '-5').warning, /número válido/);
  // Vacío: sin descuento ni aviso (también en «precio final»).
  assert.deepEqual(unitDiscount(169, '', 'total'), { unitPrice: 169, discount: 0, finalPrice: 169, ratio: 0, warning: null });
});

test('los céntimos cuadran', () => {
  const t = receiptTotals([{ name: 'Decant', quantity: 3, unitPrice: 19.99, discount: 7.5 }], 'percent');
  // 7.5% de 19.99 = 1.50 por unidad.
  assert.deepEqual([t.subtotal, t.discount, t.total], [59.97, 4.5, 55.47]);
});

test('se ignoran las líneas incompletas', () => {
  const t = receiptTotals([...lines('', ''), { name: '', quantity: 1, unitPrice: 50 }, { name: 'Sin precio', quantity: 1, unitPrice: '' }]);
  assert.equal(t.items.length, 2);
  assert.equal(t.subtotal, 547);
});

test('número, teléfono y texto para WhatsApp', () => {
  // 20:32 UTC = 15:32 en Lima.
  assert.equal(receiptNumber('2026-11-14T20:32:00Z'), '20261114-1532');
  assert.equal(phoneLabel('51994379917'), '+51 994 379 917');

  const text = receiptText(receiptTotals(lines('170', ''), 'total'), {
    number: '20261114-1532',
    dateLabel: '14 de noviembre de 2026',
    customer: 'Rosa',
    note: 'Entrega el sábado',
    whatsapp: '51994379917',
    site: 'alvianfragancias.com',
  });
  assert.match(text, /Cliente: Rosa/);
  assert.match(text, /• Hawas Ice × 2 — S\/ 189\.00 → S\/ 170\.00 c\/u \(−S\/ 19\.00 c\/u\) = S\/ 340\.00/);
  assert.match(text, /• Mandarin Sky — S\/ 169\.00\n/);
  assert.match(text, /Precio normal: S\/ 547\.00/);
  assert.match(text, /Descuento \(6\.9%\): −S\/ 38\.00/);
  assert.match(text, /\*Total a pagar: S\/ 509\.00\*/);
  assert.match(text, /\*¡Te ahorras S\/ 38\.00!\*/);
  assert.match(text, /Entrega el sábado/);

  const plain = receiptText(receiptTotals(lines('', '')), { number: '1', dateLabel: 'hoy', whatsapp: '51994379917', site: 'x' });
  assert.doesNotMatch(plain, /Descuento|ahorras|Cliente|→/);
});
