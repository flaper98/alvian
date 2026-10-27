// Pruebas del plan de caja. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCashPlan, planLineOf } from '../lib/cash-plan.mjs';

test('el saldo de cada mes pasa como saldo anterior del siguiente', () => {
  const plan = buildCashPlan({
    opening: 2000,
    lastMonth: 3,
    rows: [
      { month: 1, src: 'venta', amount: 500 },
      { month: 1, src: 'compra', amount: 1000 },
      { month: 2, src: 'abono', amount: 300.1 },
      { month: 2, src: 'gasto', sub: 'publicidad', amount: 0.2 },
    ],
  });
  assert.deepEqual(plan.opening.slice(0, 4), [2000, 1500, 1799.9, null]);
  assert.deepEqual(plan.incomeTotals.slice(0, 3), [2500, 1800.1, 1799.9]);
  assert.deepEqual(plan.closing.slice(0, 3), [1500, 1799.9, 1799.9]);
  assert.equal(plan.closing[3], null);
  assert.deepEqual(plan.totals, { opening: 2000, income: 2800.1, outflow: 1000.2, closing: 1799.9 });
});

test('solo se muestran las filas de egreso con movimiento', () => {
  const plan = buildCashPlan({ rows: [{ month: 5, src: 'retiro', amount: 800 }] });
  assert.deepEqual(plan.outflow.map((l) => l.key), ['retiro']);
  assert.equal(plan.income.length, 4);
});

test('gastos, Reparto y sobres van a su fila', () => {
  assert.equal(planLineOf('gasto', 'servicios'), 'gasto:servicios');
  assert.equal(planLineOf('gasto', 'raro'), 'gasto:otros');
  assert.equal(planLineOf('reparto', 'impuestos'), 'impuestos');
  assert.equal(planLineOf('reparto', 'deuda'), 'deuda');
  assert.equal(planLineOf('reparto', 'ganancia'), 'reserva');
  assert.equal(planLineOf('sobre', 'impuestos'), 'impuestos');
  assert.equal(planLineOf('sobre', 'reserva'), 'reserva');
});
