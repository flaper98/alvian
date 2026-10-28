import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { backfillBreakdowns } from '@/lib/db';
import { getGoalsReport } from '@/lib/reports';
import { GoalTools, MonthlyGoalsForm, NewGoalForm } from './GoalForms';

export const dynamic = 'force-dynamic';

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
// Fechas 'YYYY-MM-DD' sin hora: se muestran tal cual (UTC).
const dayFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonthFmt = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const day = (iso) => dayFmt.format(new Date(`${iso}T00:00:00Z`));
const monthDate = (key) => new Date(`${key}-15T00:00:00Z`);

const STATUS = {
  done: { label: 'Cumplida', tone: 'good' },
  'on-track': { label: 'Vas bien', tone: 'good' },
  'spend-less': { label: 'Cuida tus gastos', tone: 'warn' },
  behind: { label: 'Vas atrasado', tone: 'bad' },
  overdue: { label: 'Se pasó la fecha', tone: 'bad' },
  none: { label: 'Sin meta', tone: 'none' },
};

function Progress({ percent, label }) {
  const value = Math.max(0, Math.min(100, percent || 0));
  return (
    <div className="debt-progress plan-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

/** Qué hacer para llegar, en una frase, según cómo vas. */
function GoalAdvice({ goal }) {
  const p = goal.progress;
  const spendWord = goal.metric === 'compras' ? 'compras' : 'gastos';
  const deadline = day(goal.deadline);
  if (p.status === 'done') return <p className="plan-explain">¡Lo lograste! 🎉 Ya tienes {soles(p.current)}.</p>;
  if (p.status === 'overdue')
    return (
      <p className="plan-explain">
        La fecha ya pasó y te faltaron <strong>{soles(p.remaining)}</strong>. Edita la meta para ponerle otra fecha.
      </p>
    );
  if (p.status === 'on-track')
    return (
      <p className="plan-explain">
        A tu ritmo de los últimos 30 días llegas a <strong>{soles(p.projected)}</strong> el {deadline}. Sigue así.
      </p>
    );
  if (p.status === 'spend-less')
    return (
      <p className="plan-explain">
        Llegas si tus {spendWord} no pasan de <strong>{soles(p.spendPerWeek)} por semana</strong> hasta el {deadline}.
        A tu ritmo actual llegarías solo a {soles(p.projected)}.
      </p>
    );
  return (
    <p className="plan-explain">
      Aunque no gastes nada, a este ritmo no llegas.{' '}
      {p.moreSalesPerWeek != null ? (
        <>
          Necesitas vender unos <strong>{soles(p.moreSalesPerWeek)} más por semana</strong>, cobrar lo que te deben o
          mover el stock que no se vende.
        </>
      ) : (
        <>Necesitas registrar ventas para que este dinero crezca.</>
      )}
    </p>
  );
}

function GoalCard({ goal }) {
  const p = goal.progress;
  const status = STATUS[p.status];
  return (
    <div className="chart-card plan-perfumes goal-card">
      <div className="goal-card-head">
        <div>
          <h3 className="chart-title">{goal.title}</h3>
          <span className="hint">
            {goal.label} · para el {day(goal.deadline)}
            {p.daysLeft > 0 && p.status !== 'done' ? ` · quedan ${p.daysLeft} días` : ''}
          </span>
        </div>
        <span className={`goal-status goal-status-${status.tone}`}>{status.label}</span>
      </div>
      <p className="goal-amount">
        <strong className="plan-big">{soles(p.current)}</strong> <span>de {soles(p.target)}</span>
      </p>
      <Progress percent={p.percent} label={`${goal.title}: ${p.percent}%`} />
      <span className="hint">{p.percent}% de la meta</span>
      {p.status !== 'done' && p.status !== 'overdue' ? (
        <div className="plan-perfumes-row">
          <div>
            <span className="kpi-label">Te falta</span>
            <strong className="plan-big">{soles(p.remaining)}</strong>
            <span className="hint">≈ {soles(p.neededPerMonth)} al mes</span>
          </div>
          <div>
            <span className="kpi-label">Junta por semana</span>
            <strong className="plan-big">{soles(p.neededPerWeek)}</strong>
            <span className="hint">Hoy entran ~{soles(p.inPerWeek)} por semana</span>
          </div>
          <div>
            <span className="kpi-label">A este ritmo llegas a</span>
            <strong className={`plan-big ${p.projected >= p.target ? 'text-good' : 'text-critical'}`}>
              {soles(p.projected)}
            </strong>
            <span className="hint">
              Últimos 30 días: entró {soles(goal.in30)}, salió {soles(goal.out30)}
            </span>
          </div>
        </div>
      ) : null}
      <GoalAdvice goal={goal} />
      <p className="hint">
        {goal.hint}{' '}
        {goal.metric === 'caja' ? <Link href="/admin/caja">Ver caja →</Link> : <Link href="/admin/distribucion">Ver sobres →</Link>}
      </p>
      <GoalTools goal={goal} />
    </div>
  );
}

function MonthMetric({ metric, day: today, daysInMonth }) {
  const value = (v) => (metric.money ? soles(v) : v);
  const status = STATUS[metric.progress.status];
  return (
    <div className="chart-card goal-month">
      <div className="goal-card-head">
        <span className="kpi-label">{metric.label}</span>
        {metric.target ? <span className={`goal-status goal-status-${status.tone}`}>{status.label}</span> : null}
      </div>
      <strong className="plan-big">{value(metric.actual)}</strong>
      {metric.target ? (
        <>
          <Progress percent={metric.progress.percent} label={`${metric.label}: ${metric.progress.percent}%`} />
          <span className="hint">
            {metric.progress.percent}% de {value(metric.target)}
            {metric.key !== 'ticket' && metric.progress.status !== 'done'
              ? ` · al día ${today} de ${daysInMonth} deberías llevar ${value(Math.round(metric.progress.expected))}`
              : ''}
          </span>
        </>
      ) : (
        <span className="hint">Sin meta este mes{metric.suggestion != null ? ` · sugerida ${value(metric.suggestion)}` : ''}</span>
      )}
    </div>
  );
}

function HistoryTable({ history, metrics }) {
  return (
    <div className="pivot-scroll">
      <table className="report-table goal-history">
        <thead>
          <tr>
            <th scope="col">Mes</th>
            {metrics.map((m) => (
              <th scope="col" className="num" key={m.key}>
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...history].reverse().map((h) => (
            <tr key={h.month}>
              <th scope="row">{shortMonthFmt.format(monthDate(h.month))}</th>
              {metrics.map((m) => {
                const actual = h.values[m.key];
                const target = h.targets[m.key];
                const hit = target != null && actual >= target;
                return (
                  <td className="num" key={m.key}>
                    {m.money ? soles(actual) : actual}
                    {target != null ? (
                      <span className={`goal-history-target ${hit ? 'text-good' : 'text-critical'}`}>
                        {hit ? '✓' : '✗'} meta {m.money ? soles(target) : target}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GoalsPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let report;
  try {
    await backfillBreakdowns();
    report = await getGoalsReport();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Metas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const monthLabel = monthFmt.format(monthDate(report.month));
  const defaults = {
    title: 'Juntar para comprar más stock',
    metric: 'compras',
    target: 6000,
    deadline: `${report.today.slice(0, 4)}-12-31`,
  };

  return (
    <section className="admin-section reports goals-page">
      <div className="admin-header">
        <h1>Metas</h1>
      </div>
      <p className="hint">
        Se miden solas con tus ventas, compras y sobres. Revísalas cada lunes y ajusta al terminar el mes.
      </p>

      <h2 className="dashboard-heading">Metas de dinero</h2>
      {report.goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
      <NewGoalForm defaults={defaults} startOpen={report.goals.length === 0} />

      <h2 className="dashboard-heading">Este mes · {monthLabel}</h2>
      <div className="goal-month-grid">
        {report.monthly.map((metric) => (
          <MonthMetric key={metric.key} metric={metric} day={report.day} daysInMonth={report.daysInMonth} />
        ))}
      </div>
      <MonthlyGoalsForm month={report.month} monthLabel={monthLabel} metrics={report.monthly} />

      <h2 className="dashboard-heading">Últimos 6 meses</h2>
      <HistoryTable history={report.history} metrics={report.monthly} />
    </section>
  );
}
