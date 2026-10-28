import test from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, monthProgress, suggestTarget, lastMonths } from '../lib/goals.mjs';

test('meta de dinero: cuánto juntar por semana y cuánto se puede gastar', () => {
  const p = goalProgress({
    current: 2000,
    target: 6000,
    deadline: '2026-12-31',
    today: '2026-10-31',
    in30: 3000,
    out30: 1500,
    sales30: 6000,
  });
  assert.equal(p.remaining, 4000);
  assert.equal(p.daysLeft, 61);
  assert.equal(p.percent, 33);
  // 4000 en 61 días ≈ 459.02 por semana.
  assert.equal(p.neededPerWeek, 459.02);
  // Entran 700 por semana: sobran ~241 para comprar.
  assert.equal(p.inPerWeek, 700);
  assert.equal(p.spendPerWeek, 240.98);
  // Al ritmo neto (1500 al mes) llegas a 2000 + 3050 = 5050: hay que gastar menos.
  assert.equal(p.projected, 5050);
  assert.equal(p.status, 'spend-less');
});

test('meta de dinero: si ni sin gastar llegas, dice cuánto más vender', () => {
  const p = goalProgress({
    current: 0,
    target: 6000,
    deadline: '2026-11-28',
    today: '2026-10-31',
    in30: 1500,
    out30: 0,
    sales30: 3000,
  });
  assert.equal(p.status, 'behind');
  // Necesitas 1500/semana, entran 350: faltan 1150, y cada sol vendido deja 0.50.
  assert.equal(p.neededPerWeek, 1500);
  assert.equal(p.moreSalesPerWeek, 2300);
});

test('meta de dinero cumplida o vencida', () => {
  assert.equal(goalProgress({ current: 6100, target: 6000, deadline: '2026-12-31', today: '2026-11-01' }).status, 'done');
  assert.equal(goalProgress({ current: 100, target: 6000, deadline: '2026-10-01', today: '2026-11-01' }).status, 'overdue');
});

test('meta del mes: compara con lo que deberías llevar al día de hoy', () => {
  assert.deepEqual(monthProgress({ target: 3000, actual: 1500, day: 15, daysInMonth: 30 }), {
    percent: 50,
    expected: 1500,
    status: 'on-track',
  });
  assert.equal(monthProgress({ target: 3000, actual: 900, day: 15, daysInMonth: 30 }).status, 'behind');
  assert.equal(monthProgress({ target: 150, actual: 120, day: 10, daysInMonth: 30, prorate: false }).status, 'behind');
  assert.equal(monthProgress({ target: 0, actual: 120, day: 10, daysInMonth: 30 }).status, 'none');
});

test('meta sugerida y lista de meses', () => {
  assert.equal(suggestTarget([0, 2000, 2500, 3000]), 2750);
  assert.equal(suggestTarget([10, 12, 0], { money: false }), 13);
  assert.equal(suggestTarget([0, 0]), null);
  assert.deepEqual(lastMonths('2026-02', 3), ['2025-12', '2026-01', '2026-02']);
});
