// Pruebas de los decants. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DECANT_CONFIG,
  costPerMl,
  decantName,
  decantPrices,
  decantUnitCost,
  normalizeDecantConfig,
  openBottle,
} from '../lib/decants.mjs';

const RATES = { commissionPercent: 10, taxPercent: 0, rounding: 'nueve' };

test('Khamrah de 100 ml a S/ 90: S/ 0.90 por ml y precios de 3, 5 y 10 ml con 60% limpio', () => {
  const perMl = costPerMl(90, 100);
  assert.equal(perMl, 0.9);
  assert.equal(decantUnitCost(10, perMl, 5), 14);
  const prices = decantPrices(perMl, DEFAULT_DECANT_CONFIG, RATES);
  // 60% + 10% de comisión → se vende a 3.33 veces el costo, redondeado hacia arriba en 9.
  assert.deepEqual(
    prices.map((p) => [p.ml, p.cost, p.price]),
    [
      [3, 5.7, 19],
      [5, 8.5, 29],
      [10, 14, 49],
    ],
  );
});

test('sin costo no hay precio', () => {
  assert.equal(costPerMl(null, 100), null);
  assert.equal(decantPrices(null, DEFAULT_DECANT_CONFIG, RATES)[0].price, null);
});

test('abrir un frasco suma sus ml y promedia el costo por ml', () => {
  const first = openBottle({ poolMl: 0, poolPerMl: null, bottleMl: 100, bottleCost: 90 });
  assert.deepEqual(first, { ml: 100, perMl: 0.9 });
  // Quedaban 20 ml a 0.90 y se abre otro de 100 ml que costó 108 (1.08 por ml).
  const second = openBottle({ poolMl: 20, poolPerMl: 0.9, bottleMl: 100, bottleCost: 108 });
  assert.deepEqual(second, { ml: 120, perMl: 1.05 });
  assert.throws(() => openBottle({ bottleMl: 100, bottleCost: null }), /compra/);
});

test('la configuración se valida y se ordena por tamaño', () => {
  const config = normalizeDecantConfig({
    sizes: [
      { ml: 10, packaging: 5 },
      { ml: '3', packaging: '3' },
    ],
    marginPercent: '55',
  });
  assert.deepEqual(config, {
    sizes: [
      { ml: 3, packaging: 3 },
      { ml: 10, packaging: 5 },
    ],
    marginPercent: 55,
  });
  assert.throws(() => normalizeDecantConfig({ sizes: [{ ml: 5, packaging: -1 }] }), /envase/);
  assert.throws(() => normalizeDecantConfig({ marginPercent: 95 }), /margen/);
  assert.equal(decantName('Khamrah', 10), 'Khamrah · Decant 10 ml');
});
