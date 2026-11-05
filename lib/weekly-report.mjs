// Informe semanal: armado del texto (WhatsApp) y del correo (HTML) a partir de
// los datos de la semana. Lógica pura para poder probarla sin base de datos.
import { shiftDay } from './dashboard.mjs';
import { formatPercent, formatSoles } from './money.mjs';

const dayFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const shortDay = (day) => dayFmt.format(new Date(`${day}T12:00:00Z`)).replace('.', '');

/** La última semana completa (lunes a domingo) antes de `today` ('YYYY-MM-DD'). `end` es exclusivo. */
export function lastCompleteWeek(today) {
  const [y, m, d] = today.split('-').map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const thisMonday = shiftDay(today, { days: -weekday });
  const start = shiftDay(thisMonday, { days: -7 });
  return { start, end: thisMonday, lastDay: shiftDay(thisMonday, { days: -1 }) };
}

/** "26 oct – 1 nov 2026". */
export function weekLabel({ start, lastDay }) {
  return `${shortDay(start)} – ${shortDay(lastDay)} ${lastDay.slice(0, 4)}`;
}

const ARROWS = { up: '↑', down: '↓', flat: '→' };

/** "↑ 12.5% vs. la semana anterior" (o "→ igual" / "↑ desde S/ 0.00"). */
export function changeText(change, { money = true, previous } = {}) {
  if (!change) return '';
  if (change.direction === 'flat') return '→ igual que la semana anterior';
  const arrow = ARROWS[change.direction];
  if (change.ratio == null) return `${arrow} desde ${money ? formatSoles(previous) : previous} la semana anterior`;
  return `${arrow} ${formatPercent(Math.abs(change.ratio))} vs. la semana anterior`;
}

const pct = (ratio) => formatPercent(Math.abs(ratio));
const longDay = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** La meta de dinero que más atención necesita (la más próxima sin cumplir). */
function goalToWatch(facts) {
  return facts.metas.find((g) => g.estado !== 'done') || null;
}

/** Qué hacer con la meta, si va atrasada o hay que cuidar los gastos. */
function goalAction(goal) {
  if (!goal) return null;
  if (goal.estado === 'spend-less' && goal.gastoMaxPorSemana != null) {
    return {
      titulo: 'Cuida tus compras',
      detalle: `Para llegar a «${goal.titulo}» gasta como máximo ${formatSoles(goal.gastoMaxPorSemana)} por semana y junta ${formatSoles(goal.juntarPorSemana)}.`,
    };
  }
  if (goal.estado === 'behind') {
    return {
      titulo: 'Acelera tu meta',
      detalle:
        goal.venderMasPorSemana != null
          ? `Para llegar a «${goal.titulo}» necesitas vender unos ${formatSoles(goal.venderMasPorSemana)} más por semana, cobrar lo que te deben o mover el stock parado.`
          : `Para llegar a «${goal.titulo}» necesitas juntar ${formatSoles(goal.juntarPorSemana)} por semana.`,
    };
  }
  return null;
}

/** Lo urgente, de lo más a lo menos importante (o null si no hay nada). */
function alertOf(facts) {
  const loan = facts.prestamo;
  if (loan && loan.dias <= 7) {
    const when = loan.dias < 0 ? 'ya venció' : loan.dias === 0 ? 'vence hoy' : `vence el ${longDay.format(new Date(`${loan.fecha}T12:00:00Z`))}`;
    return `Tu cuota del préstamo de ${formatSoles(loan.cuota)} ${when}.`;
  }
  if (facts.ventas.cantidad > 0 && facts.ganancia.neta < 0) {
    // El titular ya dice cuánto perdiste: aquí, por qué.
    const top = facts.gastos.principales?.[0];
    return `Los gastos (${formatSoles(facts.gastos.total)}) superaron lo que dejaron las ventas${
      top ? `; el más grande fue ${top.concepto}: ${formatSoles(top.monto)}` : ''
    }. Revisa si todos son gastos del negocio y no compras de perfumes (esas van en Compras).`;
  }
  const overdue = facts.metas.find((g) => g.estado === 'overdue');
  if (overdue) return `Se pasó la fecha de tu meta «${overdue.titulo}»: ponle una nueva fecha.`;
  if (facts.avisos.ventasSinCosto > 0) {
    return `${facts.avisos.ventasSinCosto} venta(s) sin compra registrada: la ganancia real es menor. Regístralas en Compras.`;
  }
  return null;
}

/**
 * Análisis de la semana armado con reglas a partir de los datos (gratis, sin
 * IA): cómo te fue, cómo va tu meta, lo urgente y las 3 cosas por hacer
 * (la meta primero y luego las tareas del Plan, que ya vienen priorizadas).
 */
export function rulesAnalysis(facts) {
  const { ventas, ganancia, gastos } = facts;
  const change = ganancia.cambio;
  let titular;
  if (ventas.cantidad === 0) titular = 'Semana sin ventas registradas.';
  else if (ganancia.neta < 0) titular = `Semana con pérdida: perdiste ${formatSoles(Math.abs(ganancia.neta))}.`;
  else if (change?.direction === 'up')
    titular =
      change.ratio == null
        ? `Buena semana: ganaste ${formatSoles(ganancia.neta)}.`
        : `Buena semana: ganaste ${formatSoles(ganancia.neta)}, ${pct(change.ratio)} más que la anterior.`;
  else if (change?.direction === 'down')
    titular =
      change.ratio == null
        ? `Semana floja: ganaste ${formatSoles(ganancia.neta)}.`
        : `Semana floja: ganaste ${formatSoles(ganancia.neta)}, ${pct(change.ratio)} menos que la anterior.`;
  else titular = `Semana estable: ganaste ${formatSoles(ganancia.neta)}, casi igual que la anterior.`;

  const sentences = [];
  if (ventas.cantidad > 0) {
    const top = facts.masVendidos[0];
    sentences.push(
      `Vendiste ${formatSoles(ventas.total)} en ${ventas.cantidad} venta${ventas.cantidad === 1 ? '' : 's'} y gastaste ${formatSoles(gastos.total)}.`,
    );
    if (top) sentences.push(`Lo más vendido fue ${top.nombre} (${top.unidades}).`);
  } else if (gastos.total > 0) {
    sentences.push(`No registraste ventas y gastaste ${formatSoles(gastos.total)}.`);
  }
  const goal = goalToWatch(facts);
  if (goal) {
    sentences.push(
      `En tu meta «${goal.titulo}» llevas el ${goal.porcentaje}%${goal.juntarPorSemana > 0 ? `: junta ${formatSoles(goal.juntarPorSemana)} por semana para llegar` : ''}.`,
    );
  }

  const acciones = [];
  const fromGoal = goalAction(goal);
  if (fromGoal) acciones.push(fromGoal);
  for (const a of facts.acciones) {
    if (acciones.length >= 3) break;
    let detalle = a.detalle;
    // Reponer y cuidar las compras no se contradicen: repón dentro del tope semanal.
    if (a.clave === 'reponer' && goal?.estado === 'spend-less' && goal.gastoMaxPorSemana != null) {
      detalle = `Solo lo que más se vende y sin pasar de ${formatSoles(goal.gastoMaxPorSemana)} esta semana, para no frenar tu meta.`;
    }
    acciones.push({ titulo: a.titulo, detalle });
  }

  return { titular, resumen: sentences.join(' '), acciones, alerta: alertOf(facts) };
}

function goalLine(goal) {
  const pace =
    goal.estado === 'done'
      ? '¡cumplida!'
      : goal.juntarPorSemana > 0
        ? `junta ${formatSoles(goal.juntarPorSemana)} por semana`
        : '';
  return `${goal.titulo}: ${formatSoles(goal.tienes)} de ${formatSoles(goal.meta)} (${goal.porcentaje}%)${pace ? ` · ${pace}` : ''}`;
}

/** Texto para pegar en WhatsApp (*negrita* con asteriscos). */
export function reportText(facts, analysis) {
  const lines = [
    `*Informe semanal · Alvian* (${facts.semana.etiqueta})`,
    '',
    `*${analysis.titular}*`,
    analysis.resumen,
  ];
  if (analysis.alerta) lines.push('', `⚠️ ${analysis.alerta}`);
  lines.push(
    '',
    `💰 Ventas: ${formatSoles(facts.ventas.total)} ${changeText(facts.ventas.cambio, { previous: facts.ventas.anterior })}`.trim(),
    `📈 Ganancia neta: ${formatSoles(facts.ganancia.neta)} ${changeText(facts.ganancia.cambio, { previous: facts.ganancia.anterior })}`.trim(),
    `💸 Gastos: ${formatSoles(facts.gastos.total)}`,
    `📊 Margen: ${formatPercent(facts.ganancia.margen)} · ${facts.ventas.unidades} productos vendidos`,
  );
  const expenses = facts.gastos.principales || [];
  if (expenses.length) {
    lines.push('', '*En qué se fueron los gastos*', ...expenses.map((e) => `• ${e.concepto}: ${formatSoles(e.monto)}`));
  }
  if (facts.metas.length) {
    lines.push('', '*Metas*', ...facts.metas.map((g) => `• ${goalLine(g)}`));
  }
  if (analysis.acciones.length) {
    lines.push('', '*Qué hacer esta semana*', ...analysis.acciones.map((a, i) => `${i + 1}. ${a.titulo}: ${a.detalle}`));
  }
  if (facts.masVendidos.length) {
    lines.push('', `*Lo más vendido:* ${facts.masVendidos.map((p) => `${p.nombre} (${p.unidades})`).join(', ')}`);
  }
  return lines.join('\n');
}

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const COLORS = { up: '#0a7d2e', down: '#b23b3b', flat: '#4a5650' };

function kpiCell(label, value, change, { invert = false, previous } = {}) {
  const good = change && change.direction !== 'flat' ? (change.direction === 'up') !== invert : null;
  const color = good == null ? COLORS.flat : good ? COLORS.up : COLORS.down;
  return `<td style="padding:12px;border:1px solid #eadfc6;border-radius:8px;vertical-align:top;width:25%">
    <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#4a5650">${esc(label)}</div>
    <div style="font-size:20px;font-weight:700;color:#11251d;margin:4px 0">${esc(value)}</div>
    <div style="font-size:12px;color:${color}">${esc(changeText(change, { previous }))}</div>
  </td>`;
}

function section(title, body) {
  return `<h2 style="font-size:16px;color:#0b3b2d;margin:24px 0 8px">${esc(title)}</h2>${body}`;
}

/** Correo del informe (HTML simple con estilos en línea, como piden los clientes de correo). */
export function reportHtml(facts, analysis, { panelUrl } = {}) {
  const goals = facts.metas
    .map((g) => {
      const width = Math.max(0, Math.min(100, g.porcentaje));
      return `<div style="margin:0 0 12px">
        <div style="font-size:14px;color:#11251d">${esc(goalLine(g))}</div>
        <div style="height:8px;background:#f2e9d6;border-radius:99px;margin-top:4px"><div style="height:8px;width:${width}%;background:#0a7d2e;border-radius:99px"></div></div>
      </div>`;
    })
    .join('');
  const actions = analysis.acciones
    .map((a) => `<li style="margin:0 0 8px"><strong>${esc(a.titulo)}</strong><br><span style="color:#4a5650">${esc(a.detalle)}</span></li>`)
    .join('');
  const expenses = (facts.gastos.principales || [])
    .map((e) => `<li>${esc(e.concepto)} · ${esc(formatSoles(e.monto))}</li>`)
    .join('');
  const products = facts.masVendidos
    .map((p) => `<li>${esc(p.nombre)} · ${p.unidades} unid. · ${esc(formatSoles(p.total))}</li>`)
    .join('');
  const profitable = facts.masGanancia
    .map((p) => `<li>${esc(p.nombre)} · ganancia ${esc(formatSoles(p.ganancia))} (${esc(formatPercent(p.margen))})</li>`)
    .join('');

  return `<!doctype html><html lang="es"><body style="margin:0;background:#fcf7ec;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;color:#11251d">
    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#0e7a53;text-transform:uppercase">Alvian · Informe semanal</div>
    <div style="font-size:13px;color:#4a5650;margin-top:2px">${esc(facts.semana.etiqueta)}</div>
    <h1 style="font-size:22px;line-height:1.25;margin:12px 0 6px">${esc(analysis.titular)}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${esc(analysis.resumen)}</p>
    ${analysis.alerta ? `<p style="background:#fbecd9;color:#8a5a00;padding:10px 12px;border-radius:8px;margin:0 0 12px">⚠️ ${esc(analysis.alerta)}</p>` : ''}
    <table role="presentation" cellspacing="6" style="width:100%;border-collapse:separate"><tr>
      ${kpiCell('Ventas', formatSoles(facts.ventas.total), facts.ventas.cambio, { previous: facts.ventas.anterior })}
      ${kpiCell('Ganancia neta', formatSoles(facts.ganancia.neta), facts.ganancia.cambio, { previous: facts.ganancia.anterior })}
      ${kpiCell('Gastos', formatSoles(facts.gastos.total), facts.gastos.cambio, { invert: true, previous: facts.gastos.anterior })}
      ${kpiCell('Margen', formatPercent(facts.ganancia.margen), null)}
    </tr></table>
    <p style="font-size:13px;color:#4a5650;margin:4px 6px 0">${facts.ventas.cantidad} ventas · ${facts.ventas.unidades} productos vendidos</p>
    ${expenses ? section('En qué se fueron los gastos', `<ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.6">${expenses}</ul>`) : ''}
    ${facts.metas.length ? section('Tus metas', goals) : ''}
    ${actions ? section('Qué hacer esta semana', `<ol style="padding-left:20px;margin:0;font-size:14px;line-height:1.5">${actions}</ol>`) : ''}
    ${products ? section('Lo más vendido', `<ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.6">${products}</ul>`) : ''}
    ${profitable ? section('Lo que más ganancia dejó', `<ul style="padding-left:20px;margin:0;font-size:14px;line-height:1.6">${profitable}</ul>`) : ''}
    ${panelUrl ? `<p style="margin:28px 0 0"><a href="${esc(panelUrl)}" style="background:#0b3b2d;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none;font-weight:700">Ver el panel</a></p>` : ''}
    <p style="font-size:11px;color:#8a877c;margin-top:28px">Informe automático con los datos de tu sistema. Ganancia neta = ventas − costo − gastos.</p>
  </div></body></html>`;
}
