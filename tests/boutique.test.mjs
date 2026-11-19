import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boutiqueCode,
  boutiquePrice,
  boutiqueSplit,
  boutiqueStock,
  compactDay,
  deliveryLines,
  deliverySheet,
  isValidSede,
  nextBoutiqueCode,
  normalizeBoutiqueConfig,
  sedeName,
  settlementOf,
} from '../lib/boutique.mjs';

test('precio en la boutique: cubre su 25% y te deja tu 30%', () => {
  // 100 ÷ (1 − 0.25 − 0.30) = 222.22 → 229 (terminado en 9).
  assert.equal(boutiquePrice(100, { feePercent: 25, marginPercent: 30 }), 229);
  assert.equal(boutiquePrice(100, { feePercent: 25, marginPercent: 30, rounding: 'sol' }), 223);
  assert.equal(boutiquePrice(null, { feePercent: 25, marginPercent: 30 }), null);
});

test('reparto de un precio de boutique', () => {
  assert.deepEqual(boutiqueSplit(229, 100, { feePercent: 25 }), { fee: 57.25, youGet: 171.75, profit: 71.75, margin: 31.3 });
  assert.equal(boutiqueSplit(229, null, { feePercent: 25 }).profit, null);
});

test('unidades en cada sede de la boutique', () => {
  const stock = boutiqueStock([
    { perfumeId: 1, sede: 1, kind: 'entrega', quantity: 3 },
    { perfumeId: 1, sede: 1, kind: 'venta', quantity: 1 },
    { perfumeId: 1, sede: 1, kind: 'devolucion', quantity: 1 },
    { perfumeId: 2, sede: 1, kind: 'entrega', quantity: 2 },
    { perfumeId: 1, sede: 2, kind: 'entrega', quantity: 4 },
  ]);
  assert.deepEqual(stock, [
    { sede: 1, perfumeId: 1, delivered: 3, returned: 1, sold: 1, atBoutique: 1 },
    { sede: 1, perfumeId: 2, delivered: 2, returned: 0, sold: 0, atBoutique: 2 },
    { sede: 2, perfumeId: 1, delivered: 4, returned: 0, sold: 0, atBoutique: 4 },
  ]);
});

test('liquidación: la boutique paga el saldo menos su comisión', () => {
  assert.deepEqual(settlementOf({ total: 229, fee: 57.25 }), { balance: 229, fee: 57.25, cash: 171.75 });
  // Si ya anotaste lo que te pagó desde Por cobrar, solo falta descontar la comisión.
  assert.deepEqual(settlementOf({ total: 229, paid: 171.75, fee: 57.25 }), { balance: 57.25, fee: 57.25, cash: 0 });
  assert.deepEqual(settlementOf({ total: 229, paid: 229, fee: 57.25, feeRecorded: 57.25 }), { balance: 0, fee: 0, cash: 0 });
});

test('datos de la boutique', () => {
  assert.deepEqual(normalizeBoutiqueConfig({ name: ' Boutique Sol ', feePercent: '25', marginPercent: 30 }), {
    name: 'Boutique Sol',
    feePercent: 25,
    marginPercent: 30,
    sedes: ['Sede 1', 'Sede 2'],
  });
  assert.throws(() => normalizeBoutiqueConfig({ feePercent: 60, marginPercent: 40 }), /menos de 100%/);
  assert.throws(() => normalizeBoutiqueConfig({ name: '  ' }), /nombre/);
});

test('sedes: nombres editables, cada una con su número', () => {
  const config = normalizeBoutiqueConfig({ sedes: [' Centro ', 'Plaza'] });
  assert.deepEqual(config.sedes, ['Centro', 'Plaza']);
  assert.equal(sedeName(config, 2), 'Plaza');
  assert.ok(isValidSede(config, '1'));
  assert.ok(!isValidSede(config, 3));
  assert.throws(() => normalizeBoutiqueConfig({ sedes: ['Centro', ''] }), /cada sede/);
  assert.throws(() => normalizeBoutiqueConfig({ sedes: ['Centro', 'centro'] }), /distinto/);
});

test('código de producto ALV001 y correlativo', () => {
  assert.equal(boutiqueCode(1), 'ALV001');
  assert.equal(boutiqueCode(1234), 'ALV1234');
  assert.equal(nextBoutiqueCode([]), 'ALV001');
  assert.equal(nextBoutiqueCode(['ALV001', 'ALV007', null, 'otro']), 'ALV008');
});

test('Excel de entrega: lo que mandaste a una sede, por día', () => {
  const deliveries = [
    // 18 nov 9:00 p. m. en Lima (19 nov en UTC): cuenta el 18.
    { sede: 1, occurredAt: '2026-11-19T02:00:00Z', code: 'ALV002', name: 'Hawas Ice', quantity: 2, unitPrice: 239 },
    { sede: 1, occurredAt: '2026-11-18T15:00:00Z', code: 'ALV001', name: 'Asad', quantity: 1, unitPrice: 199 },
    { sede: 1, occurredAt: '2026-11-18T16:00:00Z', code: 'ALV001', name: 'Asad', quantity: 2, unitPrice: 199 },
    { sede: 2, occurredAt: '2026-11-18T15:00:00Z', code: 'ALV001', name: 'Asad', quantity: 5, unitPrice: 199 },
    { sede: 1, occurredAt: '2026-11-10T15:00:00Z', code: 'ALV003', name: 'Yara', quantity: 1, unitPrice: 189 },
  ];
  const lines = deliveryLines(deliveries, { sede: 1, from: '2026-11-17', to: '2026-11-18' });
  assert.deepEqual(
    lines.map((l) => [l.day, l.code, l.quantity, l.unitPrice]),
    [
      ['2026-11-18', 'ALV001', 3, 199],
      ['2026-11-18', 'ALV002', 2, 239],
    ],
  );
  assert.equal(compactDay('2026-11-18'), '18112026');

  const sheet = deliverySheet(lines);
  assert.deepEqual(sheet.data[0].map((c) => c.value), ['FECHA', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'PRECIO']);
  const [date, code, name, quantity, price] = sheet.data[1];
  assert.equal(date.value.toISOString(), '2026-11-18T00:00:00.000Z');
  assert.equal(date.format, 'dd/mm/yy');
  assert.deepEqual([code.value, name.value, quantity.value, price.value], ['ALV001', 'ASAD', 3, 199]);
  assert.equal(sheet.data.length, 3);
});
