import test from 'node:test';
import assert from 'node:assert/strict';
import { changeText, lastCompleteWeek, reportHtml, reportText, rulesAnalysis, weekLabel } from '../lib/weekly-report.mjs';

const FACTS = {
  semana: { etiqueta: '26 oct – 1 nov 2026' },
  ventas: { total: 1250, cantidad: 7, unidades: 8, anterior: 1000, cambio: { ratio: 0.25, direction: 'up' } },
  ganancia: { neta: 380.5, margen: 0.3044, anterior: 400, cambio: { ratio: -0.04875, direction: 'down' } },
  gastos: { total: 120, anterior: 0, cambio: { ratio: null, direction: 'up' } },
  avisos: { ventasSinCosto: 0, ventasCanceladas: 0 },
  prestamo: null,
  metas: [
    {
      titulo: 'Juntar para comprar',
      tienes: 2300,
      meta: 6000,
      porcentaje: 38,
      juntarPorSemana: 450,
      gastoMaxPorSemana: 120,
      venderMasPorSemana: null,
      estado: 'spend-less',
    },
  ],
  acciones: [
    { titulo: 'Cobra S/ 300', detalle: 'Tres clientes con saldo.' },
    { titulo: 'Repón Khamrah', detalle: 'Se vende rápido.' },
    { titulo: 'Mueve 2 perfumes parados', detalle: 'Haz una promoción.' },
  ],
  masVendidos: [{ nombre: 'Khamrah <Lattafa>', unidades: 3, total: 537 }],
  masGanancia: [{ nombre: 'Asad', ganancia: 120, margen: 0.4 }],
};

test('última semana completa: lunes a domingo anteriores', () => {
  // Martes 3 de noviembre → semana del lunes 26 oct al domingo 1 nov.
  assert.deepEqual(lastCompleteWeek('2026-11-03'), { start: '2026-10-26', end: '2026-11-02', lastDay: '2026-11-01' });
  // Un lunes también informa la semana que acaba de terminar.
  assert.equal(lastCompleteWeek('2026-11-02').start, '2026-10-26');
  assert.equal(weekLabel({ start: '2026-10-26', lastDay: '2026-11-01' }), '26 oct – 1 nov 2026');
});

test('variación en texto', () => {
  assert.equal(changeText({ ratio: 0.25, direction: 'up' }), '↑ 25.0% vs. la semana anterior');
  assert.equal(changeText({ ratio: null, direction: 'up' }, { previous: 0 }), '↑ desde S/ 0.00 la semana anterior');
  assert.equal(changeText({ ratio: 0.001, direction: 'flat' }), '→ igual que la semana anterior');
  assert.equal(changeText(null), '');
});

test('análisis gratis: cómo fue la semana, la meta y 3 acciones', () => {
  const a = rulesAnalysis(FACTS);
  assert.equal(a.titular, 'Semana floja: ganaste S/ 380.50, 4.9% menos que la anterior.');
  assert.match(a.resumen, /Vendiste S\/ 1,250\.00 en 7 ventas y gastaste S\/ 120\.00\./);
  assert.match(a.resumen, /llevas el 38%: junta S\/ 450\.00 por semana/);
  // La meta va primero (hay que cuidar las compras) y se completa con el Plan.
  assert.deepEqual(a.acciones.map((x) => x.titulo), ['Cuida tus compras', 'Cobra S/ 300', 'Repón Khamrah']);
  assert.match(a.acciones[0].detalle, /máximo S\/ 120\.00 por semana/);
  assert.equal(a.alerta, null);
});

test('alertas: préstamo, pérdida y semana sin ventas', () => {
  const loan = rulesAnalysis({ ...FACTS, prestamo: { cuota: 250, fecha: '2026-11-06', dias: 2 } });
  assert.equal(loan.alerta, 'Tu cuota del préstamo de S/ 250.00 vence el viernes, 6 de noviembre.');
  const loss = rulesAnalysis({ ...FACTS, ganancia: { ...FACTS.ganancia, neta: -50 } });
  assert.match(loss.alerta, /perdiste S\/ 50\.00/);
  const empty = rulesAnalysis({
    ...FACTS,
    ventas: { ...FACTS.ventas, cantidad: 0, total: 0 },
    masVendidos: [],
    metas: [],
  });
  assert.equal(empty.titular, 'Semana sin ventas registradas.');
  assert.equal(empty.resumen, 'No registraste ventas y gastaste S/ 120.00.');
});

test('texto para WhatsApp y correo', () => {
  const analysis = rulesAnalysis(FACTS);
  const text = reportText(FACTS, analysis);
  assert.match(text, /\*Informe semanal · Alvian\* \(26 oct – 1 nov 2026\)/);
  assert.match(text, /Ventas: S\/ 1,250\.00 ↑ 25\.0%/);
  assert.match(text, /Juntar para comprar: S\/ 2,300\.00 de S\/ 6,000\.00 \(38%\) · junta S\/ 450\.00 por semana/);
  const html = reportHtml(FACTS, analysis, { panelUrl: 'https://alvianfragancias.com/admin' });
  // Los nombres se escapan (nada de HTML inyectado).
  assert.match(html, /Khamrah &lt;Lattafa&gt;/);
  assert.match(html, /Ver el panel/);
});
