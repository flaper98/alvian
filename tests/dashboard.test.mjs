import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chartMonths,
  comparisonDays,
  finance,
  monthlySeries,
  rankProducts,
  shiftDay,
  sumDays,
  variation,
} from '../lib/dashboard.mjs';
import { formatPercent, formatSoles } from '../lib/money.mjs';

const DAYS = [
  { day: '2026-10-02', revenue: 300, cost: 150, commission: 0, saleCosts: 10, tax: 0, general: 0, losses: 0, units: 2, bottles: 2, sales: 2, withoutCost: 0 },
  { day: '2026-10-20', revenue: 0, cost: 0, commission: 0, saleCosts: 0, tax: 0, general: 40, losses: 0, units: 0, bottles: 0, sales: 0, withoutCost: 0 },
  { day: '2026-11-02', revenue: 200, cost: 100, commission: 0, saleCosts: 0, tax: 0, general: 20, losses: 30, units: 2, bottles: 1, sales: 2, withoutCost: 1 },
];

test('ganancia neta = ventas − costo − gastos, y margen', () => {
  const oct = finance(sumDays(DAYS, '2026-10-01', '2026-11-01'));
  assert.equal(oct.revenue, 300);
  assert.equal(oct.expenses, 50);
  assert.equal(oct.profit, 100);
  assert.equal(Math.round(oct.margin * 1000) / 10, 33.3);
  const nov = finance(sumDays(DAYS, '2026-11-01', '2026-12-01'));
  assert.deepEqual([nov.expenses, nov.profit, nov.decants, nov.withoutCost], [50, 50, 1, 1]);
  // Sin ventas el margen no existe (nada de NaN ni Infinity).
  assert.equal(finance(sumDays([], '2026-01-01', '2026-02-01')).margin, null);
});

test('variación frente al período anterior, sin dividir entre cero', () => {
  assert.deepEqual(variation(3600, 3000), { ratio: 0.2, direction: 'up' });
  assert.equal(variation(2700, 3000).direction, 'down');
  assert.equal(variation(3010, 3000).direction, 'flat');
  assert.deepEqual(variation(500, 0), { ratio: null, direction: 'up' });
  assert.deepEqual(variation(0, 0), { ratio: null, direction: 'flat' });
  // De perder a ganar (o al revés) no hay porcentaje: se muestran los montos.
  assert.deepEqual(variation(50, -100), { ratio: null, direction: 'up' });
  assert.deepEqual(variation(-213.17, 133), { ratio: null, direction: 'down' });
  // Perder menos que antes también es mejorar.
  assert.deepEqual(variation(-50, -100), { ratio: 0.5, direction: 'up' });
  assert.equal(variation(10, null), null);
});

test('comparación: mismo avance si el período sigue en curso', () => {
  // "Este mes" al 3 de noviembre → 1 al 3 de octubre.
  assert.deepEqual(comparisonDays({ preset: 'mes', start: '2026-11-01', end: '2026-12-01', today: '2026-11-03' }), {
    start: '2026-10-01',
    end: '2026-10-04',
    partial: true,
  });
  // Mes cerrado → el mes completo anterior.
  assert.deepEqual(comparisonDays({ preset: 'mes-pasado', start: '2026-10-01', end: '2026-11-01', today: '2026-11-03' }), {
    start: '2026-09-01',
    end: '2026-10-01',
    partial: false,
  });
  // Últimos 3 meses → los 3 anteriores; año pasado → el año antes.
  assert.equal(comparisonDays({ preset: '3-meses', start: '2026-09-01', end: '2026-12-01', today: '2026-11-30' }).start, '2026-06-01');
  assert.equal(comparisonDays({ preset: 'anio-pasado', start: '2025-01-01', end: '2026-01-01', today: '2026-11-03' }).start, '2024-01-01');
  // Rango propio de 10 días → los 10 días anteriores.
  assert.deepEqual(comparisonDays({ preset: 'custom', start: '2026-10-11', end: '2026-10-21', today: '2026-11-03' }), {
    start: '2026-10-01',
    end: '2026-10-11',
    partial: false,
  });
  assert.equal(comparisonDays({ preset: 'todo', start: null, end: null, today: '2026-11-03' }), null);
  assert.equal(shiftDay('2026-03-31', { months: -1 }), '2026-02-28');
});

test('meses del gráfico: al menos 6, sin meses futuros', () => {
  const months = chartMonths({ start: '2026-11-01', end: '2026-12-01', today: '2026-11-03' });
  assert.deepEqual(months.map((m) => m.key), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  assert.deepEqual(months.filter((m) => m.selected).map((m) => m.key), ['2026-11']);
  const all = chartMonths({ start: null, end: null, today: '2026-11-03', firstDay: '2026-09-05', min: 1 });
  assert.deepEqual(all.map((m) => m.key), ['2026-09', '2026-10', '2026-11']);
  const series = monthlySeries(DAYS, all);
  assert.deepEqual(series.map((m) => m.profit), [0, 100, 50]);
});

test('ranking de productos: más vendidos y más rentables', () => {
  const { topSellers, topProfit } = rankProducts(
    [
      { perfumeId: 1, name: 'Khamrah', decantMl: null, units: 5, revenue: 900, cost: 600, saleCosts: 0, withoutCost: 0 },
      { perfumeId: 2, name: 'Asad', decantMl: null, units: 2, revenue: 400, cost: 160, saleCosts: 0, withoutCost: 0 },
      { perfumeId: 2, name: 'Asad', decantMl: 5, units: 3, revenue: 60, cost: 15, saleCosts: 0, withoutCost: 0 },
    ],
    1360,
  );
  assert.deepEqual(topSellers.map((p) => p.name), ['Khamrah', 'Asad · decant 5 ml', 'Asad']);
  assert.deepEqual(topProfit.map((p) => p.profit), [300, 240, 45]);
  assert.equal(Math.round(topSellers[0].share * 1000) / 10, 66.2);
});

test('formato de soles y porcentajes', () => {
  assert.equal(formatSoles(5430), 'S/ 5,430.00');
  assert.equal(formatSoles(-80.5), '−S/ 80.50');
  assert.equal(formatSoles(Number.NaN), 'S/ 0.00');
  assert.equal(formatPercent(0.324), '32.4%');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatPercent(Infinity), '—');
});
