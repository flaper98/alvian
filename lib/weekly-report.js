import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import {
  backfillBreakdowns,
  getBoutiqueBoard,
  getWeeklyReport,
  getWeeklyReportByWeek,
  markWeeklyReportSent,
  saveWeeklyReport,
} from './db';
import {
  getBusinessPlan,
  getDashboardReport,
  getGoalsReport,
  getReceivablesReport,
  resolveReportRange,
  toDayString,
} from './reports';
import { variation } from './dashboard.mjs';
import { formatSoles } from './money.mjs';
import { SITE_URL } from './seo';
import { emailConfigured, sendEmail } from './email';
import { lastCompleteWeek, reportHtml, reportText, rulesAnalysis, weekLabel } from './weekly-report.mjs';

// Agente del informe semanal: junta los números de la semana que terminó,
// arma el análisis con qué hacer y lo envía por correo. Gratis: el análisis
// sale de reglas sobre los datos. Opcional (de pago): con ANTHROPIC_API_KEY
// lo redacta Claude, que solo escribe; los números salen de la base de datos.

const MODEL = 'claude-opus-5-5';

const AnalysisSchema = z.object({
  titular: z.string().describe('Una frase: cómo le fue al negocio esta semana.'),
  resumen: z.string().describe('2 o 3 frases que expliquen los números más importantes.'),
  acciones: z
    .array(z.object({ titulo: z.string(), detalle: z.string() }))
    .describe('Las 3 cosas más importantes por hacer esta semana, de la más urgente a la menos.'),
  alerta: z.string().nullable().describe('Algo urgente (cuota por vencer, pérdida, meta en riesgo) o null.'),
});

const SYSTEM = `Eres el analista del negocio de Alvian Perfumes, una tienda online de perfumes árabes de Pucallpa (Perú). Cada lunes le escribes al dueño un informe corto de la semana que terminó.

Reglas:
- Usa solo los datos del JSON que te paso. No inventes cifras, productos ni causas; si un dato no está, no lo menciones.
- Escribe en español de Perú, tuteando, con frases cortas y simples. Montos con el formato S/ 1,234.00.
- Compara con la semana anterior solo cuando el dato traiga "cambio".
- Las acciones deben ser concretas y realizables esta semana. Prioriza: la meta de dinero (si va atrasada o hay que cuidar gastos), cobrar lo que le deben, la cuota del préstamo si está cerca, reponer lo que se vende rápido y mover el stock parado. Apóyate en "acciones" y "reponer", que vienen del sistema.
- "alerta" solo si hay algo urgente; si no, null.`;

/** Los números de la semana (y de las metas, la caja y los pendientes) en un objeto compacto. */
export async function collectWeeklyFacts(week) {
  await backfillBreakdowns();
  const range = resolveReportRange({ desde: week.start, hasta: week.lastDay });
  const [dash, goals, plan, receivables, boutique] = await Promise.all([
    getDashboardReport(range),
    getGoalsReport(),
    getBusinessPlan(),
    getReceivablesReport(),
    getBoutiqueBoard().catch(() => null),
  ]);
  const c = dash.current;
  const p = dash.previous;
  const next = plan.loans?.next;

  return {
    semana: { desde: week.start, hasta: week.lastDay, etiqueta: weekLabel(week) },
    ventas: { total: c.revenue, cantidad: c.sales, unidades: c.units, anterior: p.revenue, cambio: variation(c.revenue, p.revenue) },
    ganancia: { neta: c.profit, margen: c.margin, anterior: p.profit, cambio: variation(c.profit, p.profit) },
    gastos: {
      total: c.expenses,
      anterior: p.expenses,
      cambio: variation(c.expenses, p.expenses),
      principales: dash.expenseItems.slice(0, 4).map((i) => ({ concepto: i.label, monto: i.value })),
    },
    masVendidos: dash.topSellers.slice(0, 3).map((x) => ({ nombre: x.name, unidades: x.units, total: x.revenue })),
    masGanancia: dash.topProfit
      .filter((x) => x.profit > 0)
      .slice(0, 3)
      .map((x) => ({ nombre: x.name, ganancia: x.profit, margen: x.margin })),
    avisos: { ventasSinCosto: c.withoutCost, ventasCanceladas: dash.cancelled.count },
    metas: goals.goals.map((g) => ({
      titulo: g.title,
      tienes: g.progress.current,
      meta: g.progress.target,
      porcentaje: g.progress.percent,
      fecha: g.deadline,
      diasRestantes: g.progress.daysLeft,
      juntarPorSemana: g.progress.neededPerWeek,
      gastoMaxPorSemana: g.progress.spendPerWeek,
      venderMasPorSemana: g.progress.moreSalesPerWeek,
      estado: g.progress.status,
    })),
    mes: {
      mes: goals.month,
      dia: goals.day,
      diasDelMes: goals.daysInMonth,
      metas: goals.monthly
        .filter((m) => m.target)
        .map((m) => ({ indicador: m.label, llevas: m.actual, meta: m.target, porcentaje: m.progress.percent, estado: m.progress.status })),
    },
    caja: plan.cash,
    valorNegocio: plan.perfumes.businessValue,
    porCobrar: {
      total: receivables.total,
      clientes: receivables.customers.length,
      masDe30Dias: receivables.ages.filter((a) => a.key !== '0-30').reduce((sum, a) => sum + a.total, 0),
    },
    boutique: boutique?.moves.length ? { teDebe: boutique.totals.owed, perfumesEnBoutique: boutique.totals.units } : null,
    prestamo: next && next.daysLeft <= 14 ? { cuota: next.amount, fecha: next.dueDate, dias: next.daysLeft } : null,
    acciones: plan.actions.slice(0, 6).map((a) => ({ clave: a.key || null, titulo: a.title, detalle: a.text })),
    reponer: plan.buyList
      .filter((b) => b.fits)
      .slice(0, 5)
      .map((b) => ({ nombre: b.name, cantidad: b.quantity, proveedor: b.best?.supplierName ?? null, costoTotal: b.total })),
  };
}

/** El análisis de Claude, validado contra AnalysisSchema. */
async function analyzeWithClaude(facts) {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    // Si Claude rechaza la consulta, la API la reintenta con otro modelo.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Resumir datos ya calculados no necesita razonar mucho.
    output_config: { effort: 'low', format: betaZodOutputFormat(AnalysisSchema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: `Datos de la semana (JSON):\n${JSON.stringify(facts)}` }],
  });
  if (response.stop_reason === 'refusal') throw new Error('Claude no generó el análisis (rechazo).');
  if (!response.parsed_output) throw new Error('La respuesta de Claude no tuvo el formato esperado.');
  return { ...response.parsed_output, acciones: response.parsed_output.acciones.slice(0, 3) };
}

function aiErrorMessage(error) {
  if (error instanceof Anthropic.AuthenticationError) return 'La clave de Claude (ANTHROPIC_API_KEY) no es válida.';
  if (error instanceof Anthropic.RateLimitError) return 'Claude estaba ocupado (límite de uso).';
  if (error instanceof Anthropic.APIConnectionError) return 'No se pudo conectar con Claude.';
  if (error instanceof Anthropic.APIError) return `Claude respondió con un error (${error.status}).`;
  return error.message;
}

/**
 * Arma (y guarda) el informe de la última semana completa. Con `send`, lo
 * envía por correo; con `skipIfSent` (la tarea programada), no repite una
 * semana ya enviada. Si Claude falla, el informe sale igual con un resumen
 * automático y el motivo queda guardado.
 */
export async function generateWeeklyReport({ send = false, skipIfSent = false, today = toDayString(new Date()) } = {}) {
  const week = lastCompleteWeek(today);
  if (skipIfSent) {
    const existing = await getWeeklyReportByWeek(week.start);
    if (existing?.sent_at) return { report: existing, skipped: true };
  }

  const facts = await collectWeeklyFacts(week);
  // Gratis por defecto: el análisis se arma con reglas. Solo si configuras una
  // clave de Claude (de pago), lo redacta Claude; si falla, vuelve a las reglas.
  let analysis = null;
  let aiError = null;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      analysis = await analyzeWithClaude(facts);
    } catch (error) {
      aiError = `${aiErrorMessage(error)} Se usó el análisis automático.`;
    }
  }
  analysis ||= rulesAnalysis(facts);

  const saved = await saveWeeklyReport({
    weekStart: week.start,
    subject: `Informe semanal Alvian · ${facts.semana.etiqueta} · Ganancia ${formatSoles(facts.ganancia.neta)}`,
    html: reportHtml(facts, analysis, { panelUrl: `${SITE_URL}/admin/reportes` }),
    text: reportText(facts, analysis),
    facts,
    analysis,
    aiError,
  });

  if (send) {
    try {
      if (!emailConfigured()) throw new Error('Falta configurar RESEND_API_KEY en Vercel.');
      const to = await sendEmail({ to: process.env.INFORME_EMAIL_TO, subject: saved.subject, html: saved.html, text: saved.text });
      await markWeeklyReportSent(saved.id, { sentTo: to.join(', ') });
    } catch (error) {
      await markWeeklyReportSent(saved.id, { error: error.message });
    }
  }
  return { report: await getWeeklyReport(saved.id), skipped: false };
}
