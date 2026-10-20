import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketKey, bucketKeys, change, groupCustomers, groupProducts, summarize, trend } from '../lib/sales-report.mjs';

const sale = (over) => ({
  id: 1,
  created_at: '2026-10-05T15:00:00Z',
  perfume_id: 1,
  name: 'Khamrah',
  category: 'unisex',
  quantity: 1,
  revenue: 200,
  cost: 100,
  commission: 20,
  logistics: 0,
  other_costs: 0,
  customer: 'Ana',
  ...over,
});

test('summarize: ganancia, pedidos web agrupados y ticket', () => {
  const rows = [
    sale({ id: 1, order_code: 'A1' }),
    sale({ id: 2, order_code: 'A1', perfume_id: 2, name: 'Asad', revenue: 100, cost: null }),
    sale({ id: 3, customer: ' ana ', logistics: 10 }),
  ];
  const t = summarize(rows);
  assert.equal(t.revenue, 500);
  assert.equal(t.profit, 500 - 200 - 60 - 10);
  assert.equal(t.orders, 2);
  assert.equal(t.averageTicket, 250);
  assert.equal(t.customers, 1);
  assert.equal(t.withoutCost, 1);
  assert.deepEqual(t.topProduct, { name: 'Khamrah', units: 2 });
});

test('change: porcentaje frente al período anterior', () => {
  assert.equal(change(112.5, 100), 0.125);
  assert.equal(change(50, 0), null);
});

test('bucketKey usa la hora de Lima y la semana empieza el lunes', () => {
  // 2026-10-20 03:00 UTC = 19 oct 22:00 en Lima (lunes).
  assert.equal(bucketKey('2026-10-20T03:00:00Z', 'dia'), '2026-10-19');
  assert.equal(bucketKey('2026-10-25T15:00:00Z', 'semana'), '2026-10-19');
  assert.equal(bucketKey('2026-10-25T15:00:00Z', 'mes'), '2026-10');
  assert.equal(bucketKey('2026-10-25T15:00:00Z', 'anio'), '2026');
});

test('bucketKeys no repite ni dibuja días futuros', () => {
  const start = new Date('2026-10-01T05:00:00Z');
  const end = new Date('2026-11-01T05:00:00Z');
  const keys = bucketKeys(start, end, 'dia', new Date('2026-10-03T20:00:00Z'));
  assert.deepEqual(keys, ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.equal(bucketKeys(start, end, 'semana', new Date('2026-10-31T20:00:00Z')).length, 5);
});

test('groupProducts separa decants y calcula margen', () => {
  const p = groupProducts([sale({}), sale({ id: 2, decant_ml: 5, revenue: 30, cost: 10, commission: 3 })]);
  assert.equal(p.length, 2);
  assert.equal(p[0].margin, 80 / 200);
  assert.equal(p[1].name, 'Khamrah · decant 5 ml');
});

test('groupCustomers marca nuevos, recurrentes y mejores', () => {
  const range = { start: new Date('2026-10-01T05:00:00Z') };
  const firsts = new Map([['ana', '2026-09-01T00:00:00Z'], ['luis', '2026-10-05T15:00:00Z']]);
  const c = groupCustomers([sale({}), sale({ id: 2, customer: 'Luis', revenue: 50 })], firsts, range);
  assert.equal(c[0].type, 'recurrente');
  assert.equal(c[1].type, 'nuevo');
  assert.ok(c[0].best && c[1].best);
});

test('trend suma por grupo', () => {
  const b = trend([sale({}), sale({ id: 2 })], ['2026-10-05'], 'dia');
  assert.deepEqual(b, [{ key: '2026-10-05', revenue: 400, profit: 160, orders: 2 }]);
});
