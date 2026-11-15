import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparison, compareCurrent, periodBounds, periodSeries, weekdayStats } from '../lib/sales-compare.mjs';

// Domingo 15 de noviembre de 2026, 10:30 a. m. en Lima.
const NOW = '2026-11-15T15:30:00Z';
let nextId = 1;
const sale = (created_at, quantity = 1, over = {}) => ({
  id: nextId++,
  created_at,
  quantity,
  revenue: 170 * quantity,
  cost: 100 * quantity,
  commission: 0,
  logistics: 0,
  other_costs: 0,
  ...over,
});
const iso = (ms) => new Date(ms).toISOString();

test('límites en hora de Lima: día, semana de lunes y mes', () => {
  const day = periodBounds('dia', NOW);
  assert.equal(iso(day.start), '2026-11-15T05:00:00.000Z');
  assert.equal(iso(day.prevSameEnd), '2026-11-14T15:30:00.000Z');

  const week = periodBounds('semana', NOW);
  assert.equal(iso(week.start), '2026-11-09T05:00:00.000Z');
  assert.equal(iso(week.prevStart), '2026-11-02T05:00:00.000Z');
  assert.equal(iso(week.prevSameEnd), '2026-11-08T15:30:00.000Z');

  const month = periodBounds('mes', NOW);
  assert.equal(iso(month.start), '2026-11-01T05:00:00.000Z');
  assert.equal(iso(month.prevSameEnd), '2026-10-15T15:30:00.000Z');
  assert.equal(iso(month.next), '2026-12-01T05:00:00.000Z');

  // El 31 de marzo se compara con todo febrero, sin pasarse a marzo.
  const march = periodBounds('mes', '2026-03-31T17:00:00Z');
  assert.equal(iso(march.prevSameEnd), '2026-03-01T05:00:00.000Z');
});

test('el mes en curso contra el pasado a la misma altura, el pasado completo y el ritmo', () => {
  const rows = [
    sale('2026-11-03T15:00:00Z', 2),
    sale('2026-11-15T15:00:00Z', 1),
    sale('2026-10-10T15:00:00Z', 1),
    sale('2026-10-20T15:00:00Z', 3), // después del 15: solo cuenta en el mes completo
  ];
  const c = compareCurrent(rows, 'mes', NOW);
  assert.deepEqual([c.current.units, c.previous.units, c.previousFull.units], [3, 1, 4]);
  assert.deepEqual([c.current.revenue, c.current.orders, c.current.ticket], [510, 2, 255]);
  // 3 perfumes en 14.4 de 30 días → unos 6 al cerrar el mes.
  assert.equal(c.projection.units, 6);
  // Hoy contra ayer: sin proyección.
  assert.equal(compareCurrent(rows, 'dia', NOW).projection, null);
});

test('evolución: últimos meses y semanas, el actual en curso y perfumes por día', () => {
  const rows = [sale('2026-10-05T15:00:00Z', 31), sale('2026-11-02T15:00:00Z', 6), sale('2026-11-10T15:00:00Z', 3)];
  const months = periodSeries(rows, 'mes', 3, NOW);
  assert.deepEqual(
    months.map((m) => [m.key, m.units, m.days, m.perDay, m.current]),
    [
      ['2026-09', 0, 30, 0, false],
      ['2026-10', 31, 31, 1, false],
      ['2026-11', 9, 15, 0.6, true],
    ],
  );
  const weeks = periodSeries(rows, 'semana', 2, NOW);
  assert.deepEqual(weeks.map((w) => [w.key, w.units]), [['2026-11-02', 6], ['2026-11-09', 3]]);
  assert.equal(periodSeries(rows, 'dia', 14, NOW).length, 14);
});

test('día de la semana: promedio en las semanas completas desde la primera venta', () => {
  const rows = [
    sale('2026-10-31T20:00:00Z', 1), // sábado
    sale('2026-11-02T15:00:00Z', 1), // lunes
    sale('2026-11-07T20:00:00Z', 2), // sábado
    sale('2026-11-07T21:00:00Z', 4, { decant_ml: 5 }), // decants: no son perfumes
    sale('2026-11-10T15:00:00Z', 5), // semana en curso: no cuenta
  ];
  const w = weekdayStats(rows, NOW);
  assert.equal(w.weeks, 2);
  assert.equal(w.days[5].units, 1.5);
  assert.equal(w.days[0].units, 0.5);
  assert.equal(w.days[1].units, 0);
  assert.deepEqual(weekdayStats([], NOW), { weeks: 0, days: [] });
});

test('buildComparison junta todo', () => {
  const c = buildComparison([sale('2026-11-14T15:00:00Z', 2)], NOW);
  assert.deepEqual(Object.keys(c.compare), ['dia', 'semana', 'mes']);
  assert.equal(c.compare.dia.previousFull.units, 2);
  assert.equal(c.compare.dia.previous.units, 2); // ayer a las 10:00, antes de la misma hora
  // Sin los períodos vacíos de antes de la primera venta (14 de noviembre).
  assert.deepEqual(c.series.mes.map((m) => m.key), ['2026-11']);
  assert.deepEqual(c.series.dia.map((d) => d.key), ['2026-11-14', '2026-11-15']);
  // El negocio empezó el 21 de septiembre: ese mes cuenta 10 días, no 30.
  const start = buildComparison([sale('2026-09-21T15:00:00Z', 20), sale('2026-11-02T15:00:00Z', 1)], NOW);
  assert.deepEqual([start.series.mes[0].key, start.series.mes[0].days, start.series.mes[0].perDay], ['2026-09', 10, 2]);
  // Sin ninguna venta, queda solo el período actual.
  assert.equal(buildComparison([], NOW).series.semana.length, 1);
});
