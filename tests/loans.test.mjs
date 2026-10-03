// Pruebas de préstamos en cuotas. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, daysBetween, installmentPlan, loanStatus, monthsToReach } from '../lib/loans.mjs';

const YAPE = { installments: 6, installmentAmount: 680.53, firstDueDate: '2026-10-28' };

test('Crédito Yape: 6 cuotas de S/ 680.53 suman S/ 4,083.18 y terminan el 28/03/2027', () => {
  const plan = installmentPlan(YAPE);
  assert.equal(plan.total, 4083.18);
  assert.equal(plan.lastDueDate, '2027-03-28');
  assert.deepEqual(plan.dueDates.slice(0, 3), ['2026-10-28', '2026-11-28', '2026-12-28']);
});

test('después de pagar la primera cuota va en la 2 de 6; al pagar todo, termina', () => {
  const fresh = loanStatus({ ...YAPE, paid: 0 });
  assert.equal(fresh.nextNumber, 1);
  assert.equal(fresh.nextDueDate, '2026-10-28');
  assert.equal(fresh.nextAmount, 680.53);

  const status = loanStatus({ ...YAPE, paid: 680.53 });
  assert.equal(status.paidInstallments, 1);
  assert.equal(status.nextNumber, 2);
  assert.equal(status.nextDueDate, '2026-11-28');
  assert.equal(status.nextAmount, 680.53);
  assert.equal(status.remainingInstallments, 5);

  const done = loanStatus({ ...YAPE, paid: 4083.18 });
  assert.equal(done.nextNumber, null);
  assert.equal(done.nextDueDate, null);
  assert.equal(done.nextAmount, 0);
  assert.equal(done.remainingInstallments, 0);
});

test('si abonó una parte de la cuota, sugiere solo lo que falta para completarla', () => {
  const status = loanStatus({ ...YAPE, paid: 300 });
  assert.equal(status.nextNumber, 1);
  assert.equal(status.nextAmount, 380.53);
});

test('fechas: fin de mes, año bisiesto, cambio de año y días que faltan', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2027-12-15', 3), '2028-03-15');
  assert.equal(daysBetween('2026-10-20', '2026-10-28'), 8);
  assert.equal(daysBetween('2026-10-30', '2026-10-28'), -2);
});

test('recuperar S/ 1,520 propios con utilidad de S/ 1,200/mes pagando la cuota Yape', () => {
  const loans = [{ installmentAmount: 680.53, remainingInstallments: 6 }];
  // Sacando toda la utilidad que queda tras la cuota (S/ 519.47 al mes): ~2.9 meses.
  assert.equal(monthsToReach(1520, { monthlyProfit: 1200, ownerShare: 1, loans }), 2.9);
  // Sacando solo el 20% de sueldo (S/ 240 al mes): ~6.3 meses.
  assert.equal(monthsToReach(1520, { monthlyProfit: 1200, ownerShare: 0.2, loans }), 6.3);
  // Reinvirtiendo todo: nunca vuelve en efectivo. Sin nada por recuperar: 0.
  assert.equal(monthsToReach(1520, { monthlyProfit: 1200, ownerShare: 0, loans }), null);
  assert.equal(monthsToReach(0, { monthlyProfit: 1200, ownerShare: 1, loans }), 0);
});

test('sin préstamo es una simple división; si la utilidad no cubre la cuota, empieza al terminar', () => {
  assert.equal(monthsToReach(1200, { monthlyProfit: 400 }), 3);
  // Utilidad de S/ 600 y cuota de S/ 680.53 por 2 meses más: nada que sacar hasta el mes 2.
  const loans = [{ installmentAmount: 680.53, remainingInstallments: 2 }];
  assert.equal(monthsToReach(500, { monthlyProfit: 600, ownerShare: 1, loans }), 2.8);
  // Sin tope de meses: con poca utilidad igual da una fecha (no "nunca").
  assert.equal(monthsToReach(1598, { monthlyProfit: 50, ownerShare: 0.2 }), 159.8);
});
