import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boutiquePrice,
  boutiqueSplit,
  boutiqueStock,
  normalizeBoutiqueConfig,
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

test('unidades en la boutique', () => {
  const stock = boutiqueStock([
    { perfumeId: 1, kind: 'entrega', quantity: 3 },
    { perfumeId: 1, kind: 'venta', quantity: 1 },
    { perfumeId: 1, kind: 'devolucion', quantity: 1 },
    { perfumeId: 2, kind: 'entrega', quantity: 2 },
  ]);
  assert.deepEqual(stock, [
    { perfumeId: 1, delivered: 3, returned: 1, sold: 1, atBoutique: 1 },
    { perfumeId: 2, delivered: 2, returned: 0, sold: 0, atBoutique: 2 },
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
  });
  assert.throws(() => normalizeBoutiqueConfig({ feePercent: 60, marginPercent: 40 }), /menos de 100%/);
  assert.throws(() => normalizeBoutiqueConfig({ name: '  ' }), /nombre/);
});
