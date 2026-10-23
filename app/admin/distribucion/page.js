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
function MoneyFlow({ flow, plan }) {
  const income = flow.incomeTotal + flow.capitalIn;
  const out = income - flow.net;
  const first = plan.steps[0];
  let note;
  if (flow.net < 0) note = 'Sale negativo: falta registrar dinero que pusiste de tu bolsillo (Caja → «Puse dinero»).';
  else if (first && first.missing > 0) note = `Alcanza para ${soles(first.covered)} de los ${soles(first.need)} del primer paso.`;
  else if (plan.steps.some((s) => s.missing > 0)) note = 'Cubre los primeros pasos; mira abajo lo que falta.';
  else note = 'Cubre todos los pagos pendientes.';
  return (
    <div className="dist-card dist-money">
      <div className="dist-money-row">
        <span>
          Ingresos <small>ventas cobradas y lo que pusiste</small>
        </span>
        <strong className="text-good">{soles(income)}</strong>
      </div>
      <div className="dist-money-row">
        <span>
          Egresos <small>compras, gastos, comisiones, deudas</small>
        </span>
        <strong className="text-critical">− {soles(out)}</strong>
      </div>
      <div className="dist-money-cash">
        <span className="dist-eyebrow">Tienes en caja</span>
        <strong className={flow.net < 0 ? 'text-critical' : 'text-good'}>{soles(flow.net)}</strong>
        <span className="dist-note">{note}</span>
      </div>
    </div>
  );
}

function SpendingPlan({ plan }) {
  const rows = [
    ...plan.steps.map((s) => ({
      ...s,
      tone: s.missing > 0 ? 'missing' : 'ok',
      sub: s.missing > 0 ? `Te faltan ${soles(s.missing)}` : 'Cubierto ✓',
      amount: s.need,
    })),
    {
      key: 'stock',
      label: 'Comprar stock',
      tone: plan.rest > 0 ? 'ok' : 'wait',
      sub: plan.rest > 0 ? 'Solo de los perfumes que se venden' : 'Todavía no: primero lo de arriba',
      amount: plan.rest,
    },
    { key: 'sueldo', label: 'Tu sueldo', tone: 'off', sub: 'Por ahora no: decidiste mantener el negocio', amount: 0 },
  ];
  return (
    <ol className="dist-card dist-steps">
      {rows.map((s, i) => (
        <li key={s.key} className={`dist-step is-${s.tone}`}>
          <span className="dist-step-num">{i + 1}</span>
          <span className="dist-step-text">
            {s.href ? <Link href={s.href}>{s.label}</Link> : s.label}
            <small>{s.sub}</small>
          </span>
          <strong>{soles(s.amount)}</strong>
        </li>
      ))}
    </ol>
  );
}

/** Barra apilada + filas con color, % y monto. */
function SplitCard({ title, subtitle, parts, total, footer, children }) {
  const positive = parts.filter((p) => p.value > 0);
  const sum = positive.reduce((s, p) => s + p.value, 0);
  return (
    <div className="dist-card">
      <h3 className="dist-card-title">{title}</h3>
      <p className="dist-card-sub">{subtitle}</p>
      <div className="dist-split-bar" aria-hidden="true">
        {positive.map((p) => (
          <span key={p.label} style={{ flexGrow: p.value / (sum || 1), background: p.color }} />
        ))}
      </div>
      <ul className="dist-split-list">
        {children}
        {parts.filter((p) => !p.barOnly).map((p) => (
          <li key={p.label}>
            <span className="dist-swatch" style={{ background: p.color }} />
            <span className="dist-split-label">{p.label}</span>
            <span className="dist-split-pct">{total > 0 ? pct((p.value / total) * 100) : '—'}</span>
            <strong className={p.sign === '-' ? 'text-critical' : undefined}>
              {p.sign === '-' ? '− ' : ''}
              {soles(p.value)}
            </strong>
          </li>
        ))}
      </ul>
      {footer}
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

  // Enlaces que conservan el período y el filtro de pago.
  const hrefWith = (changes) => {
    const next = new URLSearchParams(
      Object.entries({ periodo: params.periodo, desde: params.desde, hasta: params.hasta, pago: params.pago }).filter(
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
  const costs = t.cost + t.commission + t.logistics + t.otherCosts;
  const allRows = report.sales.map((r) => ({ ...r, dateLabel: dateFmt.format(new Date(r.created_at)) }));
  const pago = PAYMENT_LABELS[params.pago] ? params.pago : null;
  const rows = pago ? allRows.filter((r) => r.payment_type === pago) : allRows;
  const sumOf = (key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
  const shown = {
    price: sumOf('price'),
    cost: sumOf('cost'),
    commission: sumOf('commission'),
    extra: sumOf('logistics') + sumOf('other_costs'),
    profit: sumOf('net_profit'),
    reinvest: sumOf('reinvest'),
    salary: sumOf('salary'),
    reserve: sumOf('reserve'),
  };
  const desde = range.start ? toDayString(range.start) : '';
  const hasta = range.end ? toDayString(new Date(range.end.getTime() - 1)) : '';
  const plan = spendingPlan(
    cashFlow.net,
    Math.max(envelopes.envelopes.find((e) => e.key === 'comisiones')?.balance || 0, 0),
    debts,
  );
  // Barra del margen: la meta queda a mitad de camino para que se vea si la pasas.
  const marginScale = Math.max(t.margin, config.minMarginPercent * 2, 1);
  const profitPer100 = t.price > 0 ? (t.netProfit / t.price) * 100 : 0;

  return (
    <section className="admin-section reports distribution">
      <div className="admin-header">
        <div>
          <h1>Distribución de ganancias</h1>
          <p className="dist-lead">Primero ve cuánta plata tienes y en qué usarla; abajo, cómo te fue en el período.</p>
        </div>
        <ExportButtons rows={allRows} totals={t} fileName={`distribucion-${desde || 'inicio'}-a-${hasta || 'hoy'}.csv`} />
      </div>

      <div className="dist-top">
        <div>
          <div className="dist-head">
            <h2>Tu dinero</h2>
          </div>
          <MoneyFlow flow={cashFlow} plan={plan} />
        </div>
        <div>
          <div className="dist-head">
            <h2>¿En qué usar esta plata?</h2>
            <span>En este orden. Cada paso se paga con lo que quedó del anterior.</span>
          </div>
          <SpendingPlan plan={plan} />
          <p className="dist-foot no-print">
            Para pagar o sacar dinero usa <Link href="/admin/caja">Caja → Registrar salida</Link>.
          </p>
        </div>
      </div>

      <hr className="dist-divider" />

      <div className="dist-head">
        <h2>Resultados por período</h2>
        <span>
          {rangeLabel(range)} · {t.count} venta{t.count === 1 ? '' : 's'}
        </span>
      </div>
      <div className="dist-card dist-filters no-print">
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
          {pago ? <input type="hidden" name="pago" value={pago} /> : null}
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

      <div className="dist-kpis">
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Ventas</span>
          <strong>{soles(t.price)}</strong>
          <small>
            {t.count} venta{t.count === 1 ? '' : 's'}
          </small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Costos</span>
          <strong>{soles(costs)}</strong>
          <small>Producto, comisión, envío y otros</small>
        </div>
        <div className={`dist-card dist-kpi is-dark${t.netProfit < 0 ? ' is-negative' : ''}`}>
          <span className="dist-eyebrow">Utilidad neta</span>
          <strong>{soles(t.netProfit)}</strong>
          <small>Lo que se reparte</small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Margen</span>
          <strong className={t.margin >= config.minMarginPercent ? 'text-good' : 'text-critical'}>{pct(t.margin)}</strong>
          <span className="dist-meter" aria-hidden="true">
            <span
              className={t.margin >= config.minMarginPercent ? 'is-good' : 'is-bad'}
              style={{ width: `${Math.max(Math.min(t.margin / marginScale, 1), 0) * 100}%` }}
            />
            <i style={{ left: `${(config.minMarginPercent / marginScale) * 100}%` }} />
          </span>
          <small>Utilidad ÷ ventas · meta ≥ {pct(config.minMarginPercent)}</small>
        </div>
      </div>

      <div className="dist-two">
        <SplitCard
          title="Cómo se repartió cada sol vendido"
          subtitle={`De cada S/ 100 vendidos, ${soles(profitPer100)} se convierten en utilidad.`}
          total={t.price}
          parts={[
            { label: 'Costo del producto', value: t.cost, color: 'var(--dist-cost)', sign: '-' },
            { label: 'Comisión de la vendedora', value: t.commission, color: 'var(--dist-commission)', sign: '-' },
            { label: 'Envío que pagaste', value: t.logistics, color: 'var(--dist-extra)', sign: '-' },
            { label: 'Otros gastos de las ventas', value: t.otherCosts, color: 'var(--dist-extra)', sign: '-' },
            { label: 'Utilidad neta', value: Math.max(t.netProfit, 0), color: 'var(--status-good)', barOnly: true },
          ]}
          footer={
            <div className={`dist-split-total${t.netProfit < 0 ? ' is-negative' : ''}`}>
              <span>Utilidad neta</span>
              <strong>{soles(t.netProfit)}</strong>
            </div>
          }
        >
          <li>
            <span className="dist-swatch" style={{ background: 'var(--green-900)' }} />
            <span className="dist-split-label">Precio de venta</span>
            <span className="dist-split-pct">100%</span>
            <strong className="text-good">+ {soles(t.price)}</strong>
          </li>
        </SplitCard>
        <SplitCard
          title="La utilidad se repartió en"
          subtitle={`Sobre ${soles(t.netProfit)} de utilidad neta.`}
          total={t.reinvest + t.salary + t.reserve}
          parts={[
            { label: 'Reinversión', value: t.reinvest, color: 'var(--green-900)' },
            { label: 'Sueldo', value: t.salary, color: 'var(--dist-salary)' },
            { label: 'Reserva', value: t.reserve, color: 'var(--dist-reserve)' },
          ]}
          footer={
            <p className="dist-tip">
              Las ventas con pérdida no reparten nada. En crédito y pandero, los sobres reciben esto a medida que el
              cliente paga.
            </p>
          }
        />
      </div>

      {report.lowMargin.length || report.costUnknown ? (
        <div className="dist-card distribution-alerts">
          <h3 className="dist-card-title">⚠ Alertas</h3>
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

      <div className="dist-card">
        <div className="dist-head dist-head-inline">
          <h3 className="dist-card-title">Desglose por venta</h3>
          <nav className="filter-chips no-print" aria-label="Forma de pago">
            {[[null, 'Todas'], ...Object.entries(PAYMENT_LABELS)].map(([key, label]) => {
              const count = key ? allRows.filter((r) => r.payment_type === key).length : allRows.length;
              return (
                <Link
                  key={label}
                  href={hrefWith({ pago: key })}
                  scroll={false}
                  className={`filter-chip${pago === key ? ' active' : ''}`}
                  aria-current={pago === key ? 'page' : undefined}
                >
                  {label} · {count}
                </Link>
              );
            })}
          </nav>
        </div>
        {rows.length === 0 ? (
          <p className="hint">No hay ventas en este período.</p>
        ) : (
          <div className="pivot-scroll distribution-table-scroll">
            <table className="report-table distribution-table">
              <thead>
                <tr>
                  <th scope="col">Venta</th>
                  <th scope="col">Pago</th>
                  <th scope="col" className="num">Precio</th>
                  <th scope="col" className="num">Costo</th>
                  <th scope="col" className="num">Comisión</th>
                  <th scope="col" className="num">Envío + otros</th>
                  <th scope="col" className="num">Utilidad</th>
                  <th scope="col" className="num">Margen</th>
                  <th scope="col" className="num">Reinversión</th>
                  <th scope="col" className="num">Sueldo</th>
                  <th scope="col" className="num">Reserva</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.low_margin ? 'is-low-margin' : ''}>
                    <th scope="row">
                      {r.perfume_name}
                      {r.quantity > 1 ? ` × ${r.quantity}` : ''}
                      <span className="report-sub">
                        {r.dateLabel}
                        {r.customer_name ? ` · ${r.customer_name}` : ''}
                        {r.cost_unknown ? ' · sin costo registrado' : ''}
                      </span>
                    </th>
                    <td>
                      <span className={`dist-pill dist-pill-${r.payment_type}`}>
                        {PAYMENT_LABELS[r.payment_type] || r.payment_type}
                      </span>
                    </td>
                    <td className="num">{soles(r.price)}</td>
                    <td className="num">{soles(r.cost)}</td>
                    <td className="num">{soles(r.commission)}</td>
                    <td className="num">{soles(r.logistics + r.other_costs)}</td>
                    <td className={`num dist-profit${r.net_profit < 0 ? ' text-critical' : ''}`}>{soles(r.net_profit)}</td>
                    <td className="num">
                      <span className={`dist-pill ${r.low_margin ? 'dist-pill-bad' : 'dist-pill-good'}`}>
                        {r.low_margin ? '⚠ ' : ''}
                        {pct(r.margin_percent)}
                      </span>
                    </td>
                    <td className="num">{soles(r.reinvest)}</td>
                    <td className="num">{soles(r.salary)}</td>
                    <td className="num">{soles(r.reserve)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>
                    Total · {rows.length} venta{rows.length === 1 ? '' : 's'}
                  </th>
                  <td className="num">{soles(shown.price)}</td>
                  <td className="num">{soles(shown.cost)}</td>
                  <td className="num">{soles(shown.commission)}</td>
                  <td className="num">{soles(shown.extra)}</td>
                  <td className="num dist-profit">{soles(shown.profit)}</td>
                  <td className="num">{shown.price > 0 ? pct((shown.profit / shown.price) * 100) : '—'}</td>
                  <td className="num">{soles(shown.reinvest)}</td>
                  <td className="num">{soles(shown.salary)}</td>
                  <td className="num">{soles(shown.reserve)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="hint">Los márgenes por debajo de tu alerta ({pct(config.minMarginPercent)}) se marcan en rojo.</p>
      </div>

      <div className="dist-card no-print">
        <div className="dist-head dist-head-inline">
          <h3 className="dist-card-title">Porcentajes</h3>
          <span>
            Comisión {pct(commissionPercent)} · Reparto {config.reinvestPercent} / {config.salaryPercent} /{' '}
            {config.reservePercent}
          </span>
        </div>
        <DistributionConfigForm config={config} commissionPercent={commissionPercent} />
      </div>
    </section>
  );
}
