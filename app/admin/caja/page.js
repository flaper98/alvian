import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { getCashFlow, listDebts } from '@/lib/db';
import { REPORT_PRESETS, getLedger, getPaymentsSummary, resolveReportRange, toDayString } from '@/lib/reports';
import { expenseCategoryLabel } from '@/lib/expense-categories';
import LedgerTable from '../reportes/LedgerTable';
import CajaActions from './CajaActions';

export const dynamic = 'force-dynamic';

// En la Caja solo se ofrecen los períodos más usados.
const PRESETS = ['mes', 'mes-pasado', 'todo'];

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const dateTimeFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' });

export default async function CajaPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const range = resolveReportRange({ periodo: PRESETS.includes(params.periodo) ? params.periodo : 'mes' });

  let total;
  let flow;
  let summary;
  let ledger;
  let debts;
  try {
    [total, flow, summary, ledger, debts] = await Promise.all([
      getCashFlow(),
      getCashFlow({ start: range.start, end: range.end }),
      getPaymentsSummary(range),
      getLedger(range, 3000, { includeCapital: true }),
      listDebts(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Caja</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Una sola caja: lo que entró por ventas + lo que pusiste − todo lo que salió.
  const entered = flow.incomeTotal;
  const put = flow.capitalPut;
  const out = summary.total;
  const rows = ledger.map((r) => ({ ...r, dateLabel: dateTimeFmt.format(new Date(r.t)) }));
  const from = range.start ? toDayString(range.start) : 'inicio';
  const to = range.end ? toDayString(new Date(range.end.getTime() - 1)) : 'hoy';
  const periodLabel = REPORT_PRESETS[range.preset].toLowerCase();

  return (
    <section className="admin-section reports">
      <div className="cash-hero">
        <span className="cash-hero-label">Tienes en caja</span>
        <strong className={`cash-hero-value${total.net < 0 ? ' text-critical' : ''}`}>{soles(total.net)}</strong>
        <span className="hint">
          Todo lo cobrado + lo que pusiste − todo lo que salió, desde el inicio.
          {total.net < 0 ? ' Sale negativo: falta registrar dinero que pusiste de tu bolsillo («Puse dinero»).' : ''}
        </span>
        <CajaActions commissionDue={summary.pending.commission} debts={debts} />
      </div>

      <nav className="filter-chips" aria-label="Período">
        {PRESETS.map((key) => (
          <Link
            key={key}
            href={`/admin/caja?periodo=${key}`}
            className={`filter-chip${range.preset === key ? ' active' : ''}`}
            aria-current={range.preset === key ? 'page' : undefined}
          >
            {REPORT_PRESETS[key]}
          </Link>
        ))}
      </nav>

      <div className="report-body">
        <div className="cash-flow-row">
          <div className="cash-flow-item">
            <span>Entró por ventas</span>
            <strong className="text-good">+ {soles(entered)}</strong>
          </div>
          <div className="cash-flow-item">
            <span>Pusiste tú</span>
            <strong className="text-good">+ {soles(put)}</strong>
          </div>
          <div className="cash-flow-item">
            <span>Salió</span>
            <strong className="text-critical">− {soles(out)}</strong>
          </div>
          <div className="cash-flow-item cash-flow-total">
            <span>Diferencia {periodLabel}</span>
            <strong className={entered + put - out < 0 ? 'text-critical' : 'text-good'}>
              {soles(entered + put - out)}
            </strong>
          </div>
        </div>

        {summary.pending.commission > 0 || summary.pending.debt > 0 ? (
          <div className="cash-pending">
            <strong>Pendiente de pagar:</strong>
            {summary.pending.commission > 0 ? (
              <span>Vendedora {soles(summary.pending.commission)}</span>
            ) : null}
            {summary.pending.debt > 0 ? (
              <Link href="/admin/deudas">
                Deudas {soles(summary.pending.debt)} ({summary.pending.debtCount})
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="chart-card">
          <h3 className="chart-title">¿En qué se fue el dinero? · {periodLabel}</h3>
          <ul className="payments-breakdown payments-breakdown-main">
            {summary.groups
              .filter((g) => g.total > 0)
              .map((g) => (
                <li key={g.key}>
                  <span>
                    <Link href={g.href}>{g.label}</Link>
                    {g.children?.length ? (
                      <small className="hint">
                        {' '}
                        ·{' '}
                        {g.children
                          .sort((a, b) => b.total - a.total)
                          .map((c) => `${expenseCategoryLabel(c.category)} ${soles(c.total)}`)
                          .join(' · ')}
                      </small>
                    ) : null}
                  </span>
                  <strong>{soles(g.total)}</strong>
                </li>
              ))}
            {out === 0 ? <li className="hint">No salió dinero en este período.</li> : null}
          </ul>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Movimientos · {periodLabel}</h3>
          <p className="hint">
            Cada entrada y salida con su motivo. Si registraste algo por error, bórralo con la ×.
          </p>
          <LedgerTable
            rows={rows}
            fileName={`caja-${from}-a-${to}.csv`}
            truncated={ledger.length >= 3000}
            deletable
          />
        </div>
      </div>
    </section>
  );
}
