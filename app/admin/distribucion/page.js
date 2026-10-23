import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import {
  backfillBreakdowns,
  getCashFlow,
  getCommissionPercent,
  getDistributionConfig,
  getDistributionReport,
  getEnvelopes,
  listDebts,
} from '@/lib/db';
import { REPORT_PRESETS, resolveReportRange, toDayString } from '@/lib/reports';
import { DistributionConfigForm, ExportButtons } from './DistributionTools';

export const dynamic = 'force-dynamic';

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const pct = (value) => `${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

const dayFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const DAY_MS = 24 * 3600 * 1000;

/**
 * En qué usar la plata de la caja, en orden: primero lo que debes (comisión y
 * cuotas que vencen en 30 días), luego un colchón de una cuota y al final stock.
 * Cada paso se cubre con lo que quedó del anterior.
 */
function spendingPlan(cash, commissionDue, debts) {
  const limit = Date.now() + 30 * DAY_MS;
  const steps = [];
  if (commissionDue > 0) {
    steps.push({ key: 'comision', label: 'Pagar la comisión de la vendedora', need: commissionDue, href: '/admin/comisiones' });
  }
  let monthlyInstallments = 0;
  for (const d of debts) {
    if (!(d.balance > 0)) continue;
    if (d.loan?.nextDueDate) {
      monthlyInstallments += Number(d.installment_amount) || 0;
      if (new Date(`${d.loan.nextDueDate}T12:00:00Z`).getTime() <= limit) {
        steps.push({
          key: `cuota-${d.id}`,
          label: `Cuota de ${d.creditor} · vence el ${dayFmt.format(new Date(`${d.loan.nextDueDate}T12:00:00Z`))}`,
          need: d.loan.nextAmount,
          href: '/admin/deudas',
        });
      }
    } else if (d.due_date && new Date(`${d.due_date}T12:00:00Z`).getTime() <= limit) {
      steps.push({
        key: `deuda-${d.id}`,
        label: `Deuda con ${d.creditor} · vence el ${dayFmt.format(new Date(`${d.due_date}T12:00:00Z`))}`,
        need: d.balance,
        href: '/admin/deudas',
      });
    }
  }
  if (monthlyInstallments > 0) {
    steps.push({
      key: 'colchon',
      label: 'Guardar 1 cuota extra (por si un mes vendes poco)',
      need: Math.round(monthlyInstallments * 100) / 100,
    });
  }

  let left = Math.max(cash, 0);
  const planned = steps.map((s) => {
    const covered = Math.min(s.need, left);
    left -= covered;
    return { ...s, covered: Math.round(covered * 100) / 100, missing: Math.round((s.need - covered) * 100) / 100 };
  });
  return { steps: planned, rest: Math.round(left * 100) / 100 };
}

/** Ingresos, egresos y lo que queda en caja, desde que empezaste. */
function MoneyFlow({ flow }) {
  const income = flow.incomeTotal + flow.capitalIn;
  const out = income - flow.net;
  return (
    <div className="money-summary">
      <div className="money-summary-row">
        <span>
          Ingresos <small className="hint">(ventas cobradas y lo que pusiste)</small>
        </span>
        <strong className="text-good">{soles(income)}</strong>
      </div>
      <div className="money-summary-row">
        <span>
          Egresos <small className="hint">(compras, gastos, comisiones, deudas)</small>
        </span>
        <strong className="text-critical">− {soles(out)}</strong>
      </div>
      <div className={`money-summary-row money-summary-total${flow.net < 0 ? ' is-negative' : ''}`}>
        <span>Tienes en caja</span>
        <strong>{soles(flow.net)}</strong>
      </div>
      {flow.net < 0 ? (
        <p className="money-summary-msg is-negative">
          Sale negativo: falta registrar dinero que pusiste de tu bolsillo (Caja → «Puse dinero»).
        </p>
      ) : null}
    </div>
  );
}

function SpendingPlan({ plan }) {
  return (
    <div className="money-summary spending-plan">
      <ol className="spending-steps">
        {plan.steps.map((s, i) => (
          <li key={s.key} className={s.missing > 0 ? 'is-missing' : 'is-ok'}>
            <span className="spending-num">{i + 1}</span>
            <span className="spending-label">
              {s.href ? <Link href={s.href}>{s.label}</Link> : s.label}
              <small>{s.missing > 0 ? `Te faltan ${soles(s.missing)}` : 'Cubierto ✓'}</small>
            </span>
            <strong>{soles(s.need)}</strong>
          </li>
        ))}
        <li className={plan.rest > 0 ? 'is-ok' : 'is-missing'}>
          <span className="spending-num">{plan.steps.length + 1}</span>
          <span className="spending-label">
            Comprar stock
            <small>{plan.rest > 0 ? 'Solo de los perfumes que se venden' : 'Todavía no: primero lo de arriba'}</small>
          </span>
          <strong>{soles(plan.rest)}</strong>
        </li>
        <li className="is-off">
          <span className="spending-num">{plan.steps.length + 2}</span>
          <span className="spending-label">
            Tu sueldo
            <small>Por ahora no: decidiste mantener el negocio</small>
          </span>
          <strong>{soles(0)}</strong>
        </li>
      </ol>
    </div>
  );
}

function rangeLabel(range) {
  if (!range.start && !range.end) return 'Desde el inicio';
  const from = range.start ? dateFmt.format(range.start) : 'el inicio';
  const to = range.end ? dateFmt.format(new Date(range.end.getTime() - 1)) : 'hoy';
  return `${from} – ${to}`;
}

export default async function DistribucionPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const range = resolveReportRange(params);
  let config;
  let commissionPercent;
  let envelopes;
  let report;
  let cashFlow;
  let debts;
  try {
    // Las ventas anteriores al módulo se calculan una sola vez con los % de hoy.
    await backfillBreakdowns();
    [config, commissionPercent, envelopes, report, cashFlow, debts] = await Promise.all([
      getDistributionConfig(),
      getCommissionPercent(),
      getEnvelopes(),
      getDistributionReport(range),
      getCashFlow(),
      listDebts(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Distribución de ganancias</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Enlaces que conservan el período elegido abajo y cambian solo el sobre abierto.
  const hrefWith = (changes) => {
    const next = new URLSearchParams(
      Object.entries({ periodo: params.periodo, desde: params.desde, hasta: params.hasta, sobre: params.sobre }).filter(
        ([, v]) => v,
      ),
    );
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const query = next.toString();
    return `/admin/distribucion${query ? `?${query}` : ''}`;
  };

  const t = report.totals;
  const costs = t.cost + t.commission + t.logistics + t.otherCosts + t.tax;
  const rows = report.sales.map((r) => ({ ...r, dateLabel: dateFmt.format(new Date(r.created_at)) }));
  const desde = range.start ? toDayString(range.start) : '';
  const hasta = range.end ? toDayString(new Date(range.end.getTime() - 1)) : '';

  return (
    <section className="admin-section reports distribution">
      <div className="admin-header">
        <h1>Distribución de ganancias</h1>
        <ExportButtons rows={rows} totals={t} fileName={`distribucion-${desde || 'inicio'}-a-${hasta || 'hoy'}.csv`} />
      </div>
      <h2 className="dashboard-heading">Tu dinero</h2>
      <MoneyFlow flow={cashFlow} />

      <h2 className="dashboard-heading">¿En qué usar esta plata?</h2>
      <p className="hint">En este orden. Cada paso se paga con lo que quedó del anterior.</p>
      <SpendingPlan
        plan={spendingPlan(
          cashFlow.net,
          Math.max(envelopes.envelopes.find((e) => e.key === 'comisiones')?.balance || 0, 0),
          debts,
        )}
      />
      <p className="hint no-print">
        Para pagar o sacar dinero usa <Link href="/admin/caja">Caja → Registrar salida</Link>.
      </p>

      <h2 className="dashboard-heading">Resultados por período</h2>
      <div className="report-filters no-print">
        <nav className="filter-chips" aria-label="Período">
          {Object.entries(REPORT_PRESETS).map(([key, label]) => (
            <Link
              key={key}
              href={hrefWith({ periodo: key, desde: null, hasta: null })}
              className={`filter-chip${range.preset === key ? ' active' : ''}`}
              aria-current={range.preset === key ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form className="report-range-form" method="get" action="/admin/distribucion">
          {params.sobre ? <input type="hidden" name="sobre" value={params.sobre} /> : null}
          <label>
            Desde
            <input type="date" name="desde" defaultValue={params.desde || desde} />
          </label>
          <label>
            Hasta
            <input type="date" name="hasta" defaultValue={params.hasta || hasta} />
          </label>
          <button type="submit" className="btn-secondary">
            Aplicar
          </button>
        </form>
      </div>
      <p className="report-range-label">{rangeLabel(range)}</p>

      <div className="kpi-grid">
        <div className="kpi-tile">
          <span className="kpi-label">Ventas</span>
          <strong className="kpi-value">{soles(t.price)}</strong>
          <span className="kpi-sub">{t.count} venta{t.count === 1 ? '' : 's'}</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Costos</span>
          <strong className="kpi-value">{soles(costs)}</strong>
          <span className="kpi-sub">Producto, comisión, envío y otros</span>
        </div>
        <div className={`kpi-tile ${t.netProfit >= 0 ? 'kpi-tile-good' : 'kpi-tile-bad'}`}>
          <span className="kpi-label">Utilidad neta</span>
          <strong className="kpi-value">{soles(t.netProfit)}</strong>
          <span className="kpi-sub">Lo que se reparte</span>
        </div>
        <div className={`kpi-tile ${t.margin >= config.minMarginPercent ? 'kpi-tile-good' : 'kpi-tile-bad'}`}>
          <span className="kpi-label">Margen</span>
          <strong className="kpi-value">{pct(t.margin)}</strong>
          <span className="kpi-sub">Utilidad ÷ ventas (meta ≥ {pct(config.minMarginPercent)})</span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Cómo se repartió cada sol vendido</h3>
          <ul className="profit-list flow-list">
            <li className="flow-line flow-line-in">
              <span>Precio de venta</span>
              <strong>+ {soles(t.price)}</strong>
            </li>
            {[
              ['Costo del producto', t.cost],
              ['Comisión de la vendedora', t.commission],
              ['Envío que pagaste', t.logistics],
              ['Otros gastos de las ventas', t.otherCosts],
            ].map(([label, value]) => (
              <li key={label} className="flow-line flow-line-out">
                <span>{label}</span>
                <strong>− {soles(value)}</strong>
              </li>
            ))}
            <li className={`flow-total${t.netProfit < 0 ? ' flow-total-negative' : ''}`}>
              <span>Utilidad neta</span>
              <strong>{soles(t.netProfit)}</strong>
            </li>
          </ul>
        </div>
        <div className="chart-card">
          <h3 className="chart-title">La utilidad se repartió en</h3>
          <ul className="profit-list">
            <li>
              <span>Reinversión</span>
              <strong>{soles(t.reinvest)}</strong>
            </li>
            <li>
              <span>Sueldo</span>
              <strong>{soles(t.salary)}</strong>
            </li>
            <li>
              <span>Reserva</span>
              <strong>{soles(t.reserve)}</strong>
            </li>
          </ul>
          <p className="hint">
            Las ventas con pérdida no reparten nada. En crédito y pandero, los sobres reciben esto a medida
            que el cliente paga.
          </p>
        </div>
      </div>

      {report.lowMargin.length || report.costUnknown ? (
        <div className="chart-card distribution-alerts">
          <h3 className="chart-title">⚠ Alertas</h3>
          {report.lowMargin.length ? (
            <p>
              <strong>{report.lowMargin.length}</strong> venta{report.lowMargin.length === 1 ? '' : 's'} con margen menor
              a {pct(config.minMarginPercent)}: revisa el precio o el costo de esos perfumes (marcadas en la tabla).
            </p>
          ) : null}
          {report.costUnknown ? (
            <p>
              <strong>{report.costUnknown}</strong> venta{report.costUnknown === 1 ? '' : 's'} de perfumes sin compra
              registrada: su costo cuenta como 0 y la utilidad sale más alta de lo real. Registra esas compras en Compras.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="chart-card">
        <h3 className="chart-title">Desglose por venta</h3>
        {rows.length === 0 ? (
          <p className="hint">No hay ventas en este período.</p>
        ) : (
          <div className="pivot-scroll distribution-table-scroll">
            <table className="report-table distribution-table">
              <thead>
                <tr>
                  <th scope="col">Venta</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col" className="num">Costo</th>
                  <th scope="col" className="num">Comisión</th>
                  <th scope="col" className="num">Envío+otros</th>
                  <th scope="col" className="num">Utilidad</th>
                  <th scope="col" className="num">Margen</th>
                  <th scope="col" className="num">Reinv. / Sueldo / Reserva</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.low_margin ? 'is-low-margin' : ''}>
                    <th scope="row">
                      {r.perfume_name}
                      {r.quantity > 1 ? ` × ${r.quantity}` : ''}
                      <span className="report-sub">
                        {r.dateLabel} · {PAYMENT_LABELS[r.payment_type] || r.payment_type}
                        {r.customer_name ? ` · ${r.customer_name}` : ''}
                        {r.cost_unknown ? ' · sin costo registrado' : ''}
                      </span>
                    </th>
                    <td className="num">{soles(r.price)}</td>
                    <td className="num">{soles(r.cost)}</td>
                    <td className="num">{soles(r.commission)}</td>
                    <td className="num">{soles(r.logistics + r.other_costs)}</td>
                    <td className={`num ${r.net_profit < 0 ? 'text-critical' : ''}`}>{soles(r.net_profit)}</td>
                    <td className="num">
                      {r.low_margin ? <span className="badge badge-debt">⚠ {pct(r.margin_percent)}</span> : pct(r.margin_percent)}
                    </td>
                    <td className="num">
                      {soles(r.reinvest)} / {soles(r.salary)} / {soles(r.reserve)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="chart-card no-print">
        <h3 className="chart-title">Porcentajes</h3>
        <DistributionConfigForm config={config} commissionPercent={commissionPercent} />
      </div>
    </section>
  );
}
