// Pruebas de la distribución de ganancias. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBreakdown,
  normalizeConfig,
  splitProportionally,
  DEFAULT_DISTRIBUTION_CONFIG,
} from '../lib/distribucion.mjs';

const CONFIG_2_PERCENT_TAX = { ...DEFAULT_DISTRIBUTION_CONFIG, taxPercent: 2 };

test('ejemplo del requerimiento: 100 − 50 − 10 − 8 − 2 = 30 → 21 / 6 / 3', () => {
  const r = computeBreakdown(
    { price: 100, cost: 50, commissionPercent: 10, logistics: 8 },
    CONFIG_2_PERCENT_TAX,
  );
  assert.equal(r.commission, 10);
  assert.equal(r.tax, 2);
  assert.equal(r.netProfit, 30);
  assert.equal(r.reinvest, 21);
  assert.equal(r.salary, 6);
  assert.equal(r.reserve, 3);
  assert.equal(r.marginPercent, 30);
  assert.equal(r.lowMargin, false);
});

test('venta con margen bajo (< 15%) se marca como alerta', () => {
  // 150 − 120 − 15 (10%) = 15 → margen 10%
  const r = computeBreakdown({ price: 150, cost: 120, commissionPercent: 10 }, DEFAULT_DISTRIBUTION_CONFIG);
  assert.equal(r.netProfit, 15);
  assert.equal(r.marginPercent, 10);
  assert.equal(r.lowMargin, true);
  assert.equal(r.reinvest + r.salary + r.reserve, 15);
});

test('pérdida: utilidad negativa y los sobres no reciben nada', () => {
  const r = computeBreakdown({ price: 100, cost: 95, commission: 10, logistics: 5 }, DEFAULT_DISTRIBUTION_CONFIG);
  assert.equal(r.netProfit, -10);
  assert.equal(r.reinvest, 0);
  assert.equal(r.salary, 0);
  assert.equal(r.reserve, 0);
  assert.equal(r.lowMargin, true);
});

test('céntimos: el reparto siempre suma exacto la utilidad (la reserva toma el redondeo)', () => {
  // 157 − 104.33 − 15.70 = 36.97 → 70% = 25.879 → 25.88; 20% = 7.394 → 7.39; reserva 3.70
  const r = computeBreakdown({ price: 157, cost: 104.33, commissionPercent: 10 }, DEFAULT_DISTRIBUTION_CONFIG);
  assert.equal(r.netProfit, 36.97);
  assert.equal(r.reinvest, 25.88);
  assert.equal(r.salary, 7.39);
  assert.equal(r.reserve, 3.7);
  assert.equal(Math.round((r.reinvest + r.salary + r.reserve) * 100), 3697);
});

test('sin vendedora (comisión 0) y sin impuesto', () => {
  const r = computeBreakdown({ price: 179, cost: 135, commission: 0 }, DEFAULT_DISTRIBUTION_CONFIG);
  assert.equal(r.netProfit, 44);
  assert.equal(r.reinvest, 30.8);
  assert.equal(r.salary, 8.8);
  assert.equal(r.reserve, 4.4);
});

test('la configuración debe sumar 100%', () => {
  assert.throws(() => normalizeConfig({ reinvestPercent: 70, salaryPercent: 20, reservePercent: 20 }), /100%/);
  assert.deepEqual(normalizeConfig({ taxPercent: '1.5' }).taxPercent, 1.5);
});

test('reparto proporcional del envío sin perder céntimos', () => {
  const parts = splitProportionally(10, [150, 150, 100]);
  assert.deepEqual(parts, [3.75, 3.75, 2.5]);
  const odd = splitProportionally(10, [1, 1, 1]);
  assert.equal(Math.round(odd.reduce((s, p) => s + p, 0) * 100), 1000);
});
