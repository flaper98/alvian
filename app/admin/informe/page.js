import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { getWeeklyReport, listWeeklyReports } from '@/lib/db';
import { recipientStatus, resendKeyStatus } from '@/lib/email';
import ReportTools from './ReportTools';

export const dynamic = 'force-dynamic';
// Generar el informe consulta la base y a Claude: puede tardar más de un minuto.
export const maxDuration = 120;

const dateTimeFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });
const weekFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Qué falta configurar en Vercel para que el agente funcione solo. */
function SetupChecklist() {
  // Las tres primeras son gratis y bastan; la clave de Claude es opcional y de pago.
  const key = resendKeyStatus();
  const to = recipientStatus();
  const keyProblem = !key.present
    ? null
    : !key.startsOk
      ? `La clave guardada no empieza con «re_» (tiene ${key.length} caracteres): no es una clave de Resend. Cópiala de nuevo al crearla.`
      : key.innerSpace
        ? 'La clave guardada tiene espacios en medio: pégala de nuevo, de una sola vez.'
        : key.length < 30
          ? `La clave guardada es muy corta (${key.length} caracteres): parece recortada. Créala de nuevo y copia la completa.`
          : null;
  const items = [
    {
      ok: key.present && !keyProblem,
      name: 'RESEND_API_KEY',
      text: key.present
        ? keyProblem ||
          `Guardada: empieza con «re_» y tiene ${key.length} caracteres${key.hadExtra ? ' (tenía espacios o comillas de más; ya se ignoran)' : ''}.`
        : 'Clave de Resend (resend.com → API Keys) para enviar el correo. Gratis hasta 3,000 correos al mes.',
    },
    {
      ok: to.valid.length > 0 && to.invalid.length === 0,
      name: 'INFORME_EMAIL_TO',
      text: !process.env.INFORME_EMAIL_TO
        ? 'Tu correo (el mismo con el que creaste la cuenta de Resend).'
        : to.valid.length === 0
          ? 'No tiene un correo válido: pon solo tu correo, por ejemplo nombre@gmail.com (sin comillas ni espacios).'
          : `Se enviará a: ${to.valid.join(', ')}${to.invalid.length ? ` · no válido, se ignora: ${to.invalid.join(', ')}` : ''}. Debe ser el correo de tu cuenta de Resend.`,
    },
    { ok: Boolean(process.env.CRON_SECRET), name: 'CRON_SECRET', text: 'Una clave larga inventada por ti: protege la tarea de los lunes.' },
  ];
  const missing = items.filter((i) => !i.ok);
  const claude = Boolean(process.env.ANTHROPIC_API_KEY);
  return (
    <details className="chart-card informe-setup" open={missing.length > 0}>
      <summary>
        {missing.length ? `Configuración: faltan ${missing.length} de ${items.length}` : 'Configuración completa: se envía solo cada lunes a las 8:00'}
      </summary>
      <ul className="informe-checklist">
        {items.map((i) => (
          <li key={i.name} className={i.ok ? 'is-ok' : 'is-missing'}>
            <span aria-hidden="true">{i.ok ? '✓' : '○'}</span>
            <span>
              <code>{i.name}</code> — {i.text}
            </span>
          </li>
        ))}
        <li className={claude ? 'is-ok' : undefined}>
          <span aria-hidden="true">{claude ? '✓' : '·'}</span>
          <span>
            <code>ANTHROPIC_API_KEY</code> — Opcional y de pago: si la agregas, el análisis lo redacta Claude. Sin ella,
            el análisis se arma solo con tus datos, gratis.
          </span>
        </li>
      </ul>
      <p className="hint">Se agregan en Vercel → tu proyecto → Settings → Environment Variables, y luego un nuevo deploy.</p>
    </details>
  );
}

export default async function WeeklyReportPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const { id } = await searchParams;
  let reports = [];
  let report = null;
  try {
    reports = await listWeeklyReports();
    const selected = Number(id) || reports[0]?.id;
    report = selected ? await getWeeklyReport(selected) : null;
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Informe semanal</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section reports informe-page">
      <div className="admin-header">
        <h1>Informe semanal</h1>
      </div>
      <p className="hint">
        Cada lunes a las 8:00 el agente revisa la semana que terminó (lunes a domingo): ventas, ganancia, gastos, metas,
        lo que te deben y qué reponer. Te dice qué hacer esta semana y te llega por correo. Todo gratis.
      </p>

      <SetupChecklist />
      <ReportTools report={report ? { id: report.id, text: report.text } : null} />

      {report ? (
        <div className="chart-card">
          <div className="informe-head">
            <div>
              <h3 className="chart-title">Semana del {weekFmt.format(new Date(`${report.week_start}T12:00:00Z`))}</h3>
              <span className="hint">
                Generado el {dateTimeFmt.format(new Date(report.created_at))}
                {report.sent_at ? ` · enviado a ${report.sent_to} el ${dateTimeFmt.format(new Date(report.sent_at))}` : ' · no enviado'}
              </span>
            </div>
          </div>
          {report.send_error ? <p className="form-error">Correo: {report.send_error}</p> : null}
          {report.ai_error ? <p className="hint dash-warning">{report.ai_error}</p> : null}
          {/* Vista previa del correo tal como llega (sin scripts). */}
          <iframe className="informe-preview" title="Vista previa del informe" sandbox="" srcDoc={report.html} />
        </div>
      ) : (
        <p className="dash-empty">Todavía no hay informes. Toca «Generar informe» para crear el de la semana pasada.</p>
      )}

      {reports.length > 1 ? (
        <div className="chart-card">
          <h3 className="chart-title">Informes anteriores</h3>
          <ul className="informe-history">
            {reports.map((r) => (
              <li key={r.id} className={report?.id === r.id ? 'active' : undefined}>
                <Link href={`/admin/informe?id=${r.id}`}>Semana del {weekFmt.format(new Date(`${r.week_start}T12:00:00Z`))}</Link>
                <span className="hint">{r.sent_at ? 'Enviado' : r.send_error ? 'Error al enviar' : 'No enviado'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
