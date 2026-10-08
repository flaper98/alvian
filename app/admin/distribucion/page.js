import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import {
  backfillBreakdowns,
  getCommissionPercent,
  getDistributionConfig,
  getDistributionReport,
  getEnvelopeDetail,
  getEnvelopes,
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

/** Tabla de movimientos de un lado del sobre (lo que entró o lo que salió). */
function EnvelopeRows({ title, total, explain, rows, adjustments = [], showCollected = false, sign }) {
  return (
    <div className="envelope-detail-side">
      <h4>
        {title} <span className={sign === '+' ? 'text-good' : 'text-critical'}>{soles(total)}</span>
      </h4>
      <p className="hint">{explain}</p>
      {rows.length === 0 && adjustments.length === 0 ? (
        <p className="hint">Nada todavía.</p>
      ) : (
        <div className="pivot-scroll report-scroll-sm">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Qué fue</th>
                <th scope="col" className="num">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="ledger-date">{dateFmt.format(new Date(r.date))}</td>
                  <th scope="row">
                    <Link href={r.href} className="envelope-detail-link">
                      {r.concept}
                    </Link>
                    <span className="report-sub">{r.detail}</span>
                    {showCollected && r.collectedPercent < 100 ? (
                      <span className="report-sub">
                        Le toca {soles(r.full)} · cobrado {r.collectedPercent}%: el resto entra cuando te paguen
                      </span>
                    ) : null}
                  </th>
                  <td className="num">{soles(r.amount)}</td>
                </tr>
              ))}
              {adjustments.map((a) => (
                <tr key={a.label} className="envelope-adjustment">
                  <td />
                  <th scope="row">{a.label}</th>
                  <td className="num">{soles(a.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  Total
                </th>
                <td className="num">
                  <strong>{soles(total)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/** Lo que pasó dentro de un sobre: de dónde vino cada sol y en qué se fue. */
function EnvelopeDetail({ detail, closeHref }) {
  return (
    <div className="chart-card envelope-detail" id="detalle-sobre">
      <div className="envelope-detail-head">
        <div>
          <span className="kpi-label">Detalle del sobre</span>
          <h3 className="chart-title">{detail.label}</h3>
          <p className="envelope-detail-totals">
            Entró <span className="text-good">{soles(detail.in)}</span> − salió{' '}
            <span className="text-critical">{soles(detail.out)}</span> = queda{' '}
            <strong className={detail.balance < 0 ? 'text-critical' : 'text-good'}>{soles(detail.balance)}</strong>
          </p>
        </div>
        <Link href={closeHref} scroll={false} className="btn-secondary">
          Cerrar ×
        </Link>
      </div>
      <div className="chart-grid">
        <EnvelopeRows
          title="Entró"
          total={detail.in}
          explain={detail.explain.in}
          rows={detail.inRows}
          showCollected
          sign="+"
        />
        <EnvelopeRows
          title="Salió"
          total={detail.out}
          explain={detail.explain.out}
          rows={detail.outRows}
          adjustments={detail.adjustments}
          sign="−"
        />
      </div>
      {detail.balance < 0 ? (
        <p className="envelope-detail-warn">
          Salió más de lo que entró. Revisa la lista de «Salió»: si algo está repetido o mal anotado, toca la fila y
          corrígelo o bórralo en su sección (las salidas antiguas del Reparto se borran en Caja → Movimientos con la ×).
          Si todo está bien, el faltante se cubrió con plata de otros sobres.
        </p>
      ) : null}
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
  let detail = null;
  try {
    // Las ventas anteriores al módulo se calculan una sola vez con los % de hoy.
    await backfillBreakdowns();
    [config, commissionPercent, envelopes, report, detail] = await Promise.all([
      getDistributionConfig(),
      getCommissionPercent(),
      getEnvelopes(),
      getDistributionReport(range),
      // Sobre abierto (?sobre=reserva): cada movimiento que forma su "Entró" y su "Salió".
      params.sobre ? getEnvelopeDetail(String(params.sobre)) : Promise.resolve(null),
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
      <p className="hint">
        Cada venta se reparte así: precio − costo − comisión − envío − otros − impuesto = utilidad neta, y la
        utilidad va {config.reinvestPercent}% a Reinversión, {config.salaryPercent}% a tu Sueldo y {config.reservePercent}% a
        la Reserva. Los sobres se llenan con lo ya cobrado.
      </p>

      <h2 className="dashboard-heading">Tus sobres hoy</h2>
      <div className="envelope-grid">
        {envelopes.envelopes.map((e) => {
          const open = detail?.key === e.key;
          return (
            <Link
              key={e.key}
              href={open ? hrefWith({ sobre: null }) : `${hrefWith({ sobre: e.key })}#detalle-sobre`}
              scroll={!open}
              className={`envelope-card envelope-card-link${e.balance < 0 ? ' is-negative' : ''}${open ? ' is-open' : ''}`}
              aria-expanded={open}
            >
              <span className="envelope-label">{e.label}</span>
              <strong className="envelope-balance">{soles(e.balance)}</strong>
              <span className="envelope-flow">
                Entró {soles(e.in)} · salió {soles(e.out)}
              </span>
              <span className="hint">{e.hint}</span>
              {e.balance < 0 ? <span className="envelope-warn">Gastaste más de lo apartado</span> : null}
              <span className="envelope-more">{open ? 'Ocultar detalle ↑' : 'Ver qué entró y qué salió →'}</span>
            </Link>
          );
        })}
      </div>
      {detail ? <EnvelopeDetail detail={detail} closeHref={hrefWith({ sobre: null })} /> : null}
      <p className="hint no-print">
        Para sacar dinero de un sobre usa <Link href="/admin/caja">Caja → Registrar salida</Link>: pago a la
        vendedora, saqué para mí (sueldo), pagué impuestos, usé la reserva o compra de perfumes.
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
          <span className="kpi-sub">Producto, comisión, envío, otros e impuesto</span>
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
              ['Impuesto estimado', t.tax],
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
                  <th scope="col" className="num">Impuesto</th>
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
                    <td className="num">{soles(r.tax)}</td>
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
