import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { REPORT_PRESETS, getLedger, getPaymentsSummary, resolveReportRange, toDayString } from '@/lib/reports';
import { expenseCategoryLabel } from '@/lib/expense-categories';
import LedgerTable from '../reportes/LedgerTable';

export const dynamic = 'force-dynamic';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const dateTimeFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' });

function rangeLabel(range) {
  if (!range.start && !range.end) return 'Desde el inicio';
  const from = range.start ? dateFmt.format(range.start) : 'el inicio';
  const to = range.end ? dateFmt.format(new Date(range.end.getTime() - 1)) : 'hoy';
  return `${from} – ${to}`;
}

export default async function PagosPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const range = resolveReportRange(params);
  let summary;
  let ledger;
  try {
    [summary, ledger] = await Promise.all([getPaymentsSummary(range), getLedger(range)]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Resumen de pagos</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const max = Math.max(...summary.groups.map((g) => g.total), 0);
  const outflows = ledger
    .filter((r) => r.kind === 'out')
    .map((r) => ({ ...r, dateLabel: dateTimeFmt.format(new Date(r.t)) }));
  const from = range.start ? toDayString(range.start) : 'inicio';
  const to = range.end ? toDayString(new Date(range.end.getTime() - 1)) : 'hoy';

  return (
    <section className="admin-section reports">
      <div className="admin-header">
        <h1>Resumen de pagos</h1>
      </div>
      <p className="hint">
        Todo el dinero que salió del negocio: comisiones de la vendedora, tu sueldo, deudas, gastos y
        mercadería. Para registrar un pago, entra a su sección con el enlace de cada fila.
      </p>

      <nav className="filter-chips" aria-label="Período">
        {Object.entries(REPORT_PRESETS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/pagos?periodo=${key}`}
            className={`filter-chip${range.preset === key ? ' active' : ''}`}
            aria-current={range.preset === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <p className="report-range-label">{rangeLabel(range)}</p>

      <div className="report-body">
        <div className="kpi-grid">
          <div className="kpi-tile">
            <span className="kpi-label">Pagaste en total</span>
            <strong className="kpi-value">{soles(summary.total)}</strong>
            <span className="kpi-sub">En este período</span>
          </div>
          <Link href="/admin/comisiones" className={`kpi-tile kpi-link${summary.pending.commission > 0 ? ' kpi-tile-bad' : ' kpi-tile-good'}`}>
            <span className="kpi-label">Por pagar a la vendedora</span>
            <strong className="kpi-value">{soles(summary.pending.commission)}</strong>
            <span className="kpi-sub">Comisión ya cobrada al cliente · pagar →</span>
          </Link>
          <Link href="/admin/deudas" className={`kpi-tile kpi-link${summary.pending.debt > 0 ? ' kpi-tile-bad' : ' kpi-tile-good'}`}>
            <span className="kpi-label">Debes</span>
            <strong className="kpi-value">{soles(summary.pending.debt)}</strong>
            <span className="kpi-sub">
              {summary.pending.debtCount} deuda{summary.pending.debtCount === 1 ? '' : 's'} por pagar →
            </span>
          </Link>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">¿En qué se fue el dinero?</h3>
          <ul className="bar-list">
            {summary.groups.map((g) => (
              <li key={g.key}>
                <div className="bar-list-head">
                  <Link href={g.href}>{g.label}</Link>
                  <strong>{soles(g.total)}</strong>
                </div>
                <div className="bar-list-track" title={`${g.label}: ${soles(g.total)}`}>
                  <span
                    style={{
                      width: `${max > 0 ? Math.max((g.total / max) * 100, g.total > 0 ? 1.5 : 0) : 0}%`,
                      background: 'var(--series-out)',
                    }}
                  />
                </div>
                {g.capital > 0 ? <span className="bar-list-sub">{soles(g.capital)} pagado con capital (tu bolsillo)</span> : null}
                {g.children?.length ? (
                  <ul className="payments-breakdown">
                    {g.children
                      .sort((a, b) => b.total - a.total)
                      .map((c) => (
                        <li key={c.category}>
                          <span>
                            {expenseCategoryLabel(c.category)} <span className="hint">· {c.count}</span>
                          </span>
                          <strong>{soles(c.total)}</strong>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Detalle de pagos</h3>
          <LedgerTable rows={outflows} fileName={`pagos-${from}-a-${to}.csv`} truncated={ledger.length >= 3000} hideKindFilter />
        </div>
      </div>
    </section>
  );
}
