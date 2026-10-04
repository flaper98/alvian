// Pruebas de los precios automáticos. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  netMargin,
  normalizePricingConfig,
  planPrices,
  priceMultiplier,
  roundPrice,
  scaleComparePrice,
  suggestPrice,
} from '../lib/pricing.mjs';

const RATES = { commissionPercent: 10, taxPercent: 0 };

test('redondeo siempre hacia arriba: en 9, a 5, a 10 o al sol', () => {
  assert.equal(roundPrice(183.2, 'nueve'), 189);
  assert.equal(roundPrice(183.2, 'cinco'), 185);
  assert.equal(roundPrice(183.2, 'diez'), 190);
  assert.equal(roundPrice(183.2, 'sol'), 184);
  assert.equal(roundPrice(189, 'nueve'), 189);
  assert.equal(roundPrice(190, 'nueve'), 199);
  // Un 200 que llega como 199.99999999999997 por los decimales no salta de más.
  assert.equal(roundPrice(80 / 0.4, 'sol'), 200);
  assert.equal(roundPrice(0, 'nueve'), 0);
});

test('margen limpio 50% con comisión 10%: se vende a 2.5 veces el costo', () => {
  assert.equal(priceMultiplier({ marginPercent: 50, ...RATES }), 2.5);
  assert.equal(suggestPrice(80, { marginPercent: 50, ...RATES, rounding: 'sol' }), 200);
  // En 9 y hacia arriba: 200 → 209, y el margen queda un poco por encima del 50%.
  assert.equal(suggestPrice(80, { marginPercent: 50, ...RATES, rounding: 'nueve' }), 209);
  assert.equal(netMargin(209, 80, RATES), 51.7);
  // 40% limpio = vender al doble del costo.
  assert.equal(priceMultiplier({ marginPercent: 40, ...RATES }), 2);
  assert.equal(suggestPrice(100, { marginPercent: 40, ...RATES, rounding: 'sol' }), 200);
});

test('sin costo o con un margen imposible no hay precio sugerido', () => {
  assert.equal(suggestPrice(null, { marginPercent: 50, ...RATES }), null);
  assert.equal(suggestPrice(0, { marginPercent: 50, ...RATES }), null);
  assert.equal(suggestPrice(100, { marginPercent: 80, commissionPercent: 30 }), null);
});

test('el precio "antes" mantiene el mismo % de descuento; sin descuento no se toca', () => {
  // Antes 180 / ahora 150 (−17%) → sube a 209 → antes 250.80 → en 9: 259.
  assert.equal(scaleComparePrice(180, 150, 209, 'nueve'), 259);
  assert.equal(scaleComparePrice(null, 150, 209, 'nueve'), null);
  assert.equal(scaleComparePrice(140, 150, 209, 'nueve'), 140);
});

test('plan: sube los que están por debajo, respeta los fijos y nunca baja precios', () => {
  const plan = planPrices(
    [
      { id: 1, price: 130, cost: 80 },
      { id: 2, price: 260, cost: 80 },
      { id: 3, price: 100, cost: null },
      { id: 4, price: 120, cost: 80, locked: true },
      { id: 5, price: 0, cost: 60 },
    ],
    { marginPercent: 50, rounding: 'nueve' },
    RATES,
  );
  const byId = Object.fromEntries(plan.map((p) => [p.id, p]));
  assert.equal(byId[1].status, 'subir');
  assert.equal(byId[1].suggested, 209);
  assert.equal(byId[1].marginNow, 28.5);
  assert.equal(byId[1].marginNew, 51.7);
  assert.equal(byId[2].status, 'ok');
  assert.equal(byId[3].status, 'sin-costo');
  assert.equal(byId[4].status, 'fijo');
  // Un perfume sin precio todavía (0) recibe su precio: 60 × 2.5 = 150 → 159.
  assert.equal(byId[5].status, 'subir');
  assert.equal(byId[5].suggested, 159);
});

test('la regla se valida', () => {
  assert.throws(() => normalizePricingConfig({ marginPercent: 85 }), /80%/);
  assert.throws(() => normalizePricingConfig({ rounding: 'raro' }), /redondear/);
  assert.deepEqual(normalizePricingConfig({ marginPercent: '45', rounding: 'cinco', auto: true }), {
    marginPercent: 45,
    rounding: 'cinco',
    auto: true,
  });
});
