// Pruebas de la distribución de ganancias. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBreakdown,
  normalizeConfig,
  sellOutForecast,
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

test('si vendes todo: capital + ganancia + comisión = precio de lista; sin costo o sin precio van aparte', () => {
  const f = sellOutForecast(
    [
      { stock: 2, price: 150, unitCost: 80 }, // se cuenta: 300 a precio de venta, 160 de capital
      { stock: 1, price: 100, unitCost: null }, // sin compra registrada
      { stock: 3, price: 0, unitCost: 50 }, // sin precio (no está a la venta)
      { stock: 0, price: 200, unitCost: 90 }, // sin stock
    ],
    { commissionPercent: 10, taxPercent: 0 },
  );
  assert.equal(f.units, 2);
  assert.equal(f.retail, 300);
  assert.equal(f.capital, 160);
  assert.equal(f.commission, 30);
  assert.equal(f.profit, 110);
  assert.equal(f.cashIn, 270);
  assert.equal(f.marginPercent, 36.7);
  assert.deepEqual(f.noCost, { count: 1, units: 1, retail: 100 });
  assert.deepEqual(f.noPrice, { count: 1, units: 3 });
});

test('si vendes todo: costo promedio con muchos decimales e impuesto, en céntimos exactos', () => {
  const f = sellOutForecast([{ stock: 3, price: 129.9, unitCost: 250 / 3 }], { commissionPercent: 10, taxPercent: 2 });
  assert.equal(f.capital, 250);
  assert.equal(f.commission, 38.97);
  assert.equal(f.tax, 7.79);
  assert.equal(f.profit, 92.94);
  assert.equal(f.cashIn, 342.94);
  assert.equal(sellOutForecast([]).marginPercent, 0);
});
