import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import {
  backfillBreakdowns,
  getCashFlow,
  getCommissionPercent,
  getDistributionConfig,
  getDistributionReport,
  getEnvelopeDetail,
  getEnvelopes,
  listEnvelopeTransfers,
} from '@/lib/db';
import { REPORT_PRESETS, resolveReportRange, toDayString } from '@/lib/reports';
import { DistributionConfigForm, EnvelopeTransfer, ExportButtons } from './DistributionTools';

export const dynamic = 'force-dynamic';

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const pct = (value) => `${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

// Primero lo que debes, luego lo del negocio y al final lo tuyo. Impuestos solo si se usa.
const ENVELOPE_ORDER = ['comisiones', 'reserva', 'reinversion', 'reposicion', 'sueldo', 'impuestos'];
function orderedEnvelopes(list) {
  return ENVELOPE_ORDER.map((key) => list.find((e) => e.key === key)).filter(
    (e) => e && !(e.key === 'impuestos' && e.in === 0 && e.balance === 0),
  );
}

/** Una frase por sobre, sin "entró/salió": qué es y, si está en rojo, qué pasó. */
function envelopeNote(e, config) {
  if (e.balance < 0) {
    return `Usaste ${soles(-e.balance)} más de lo que tenía: se repone con las próximas ventas.`;
  }
  if (e.key === 'sueldo' && Number(config.salaryPercent) === 0 && e.balance > 0) {
    return 'De ventas anteriores. Si no lo vas a sacar, pásalo al Colchón (abajo).';
  }
  if (e.key === 'reposicion' && e.balance === 0) return 'Todo lo vendido ya se volvió a comprar.';
  return e.hint;
}

function summaryMessage(total, free) {
  if (total < 0) return 'La caja sale negativa: falta registrar dinero que pusiste de tu bolsillo (Caja → «Puse dinero»).';
  if (free < 0) {
    return `Te faltan ${soles(-free)} para pagarle toda la comisión: esa plata se fue en stock. No está perdida, está en perfumes. Con las próximas ventas, primero págale a la vendedora y no compres stock nuevo hasta que esto quede en positivo.`;
  }
  return 'Vas bien: después de pagar la comisión, este dinero queda libre para el negocio.';
}

/**
 * Lo primero que hay que entender: cuánta plata deberías tener, cuánto ya es
 * de la vendedora y cuánto queda libre para el negocio.
 */
function MoneySummary({ envelopes, cash }) {
  const total = Math.round(Number(cash) * 100) / 100;
  const owed = Math.max(envelopes.envelopes.find((e) => e.key === 'comisiones')?.balance || 0, 0);
  const free = Math.round((total - owed) * 100) / 100;
  return (
    <div className="money-summary">
      <div className="money-summary-row">
        <span>Tienes en caja</span>
        <strong>{soles(total)}</strong>
      </div>
      <div className="money-summary-row">
        <span>De eso, es de la vendedora (comisión)</span>
        <strong>− {soles(owed)}</strong>
      </div>
      <div className={`money-summary-row money-summary-total${free < 0 ? ' is-negative' : ''}`}>
        <span>Libre para el negocio</span>
        <strong>{soles(free)}</strong>
      </div>
      <p className={free < 0 ? 'money-summary-msg is-negative' : 'money-summary-msg'}>
        {summaryMessage(total, free)}
      </p>
    </div>
  );
}

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
  let transfers = [];
  let cashFlow;
  try {
    // Las ventas anteriores al módulo se calculan una sola vez con los % de hoy.
    await backfillBreakdowns();
    [config, commissionPercent, envelopes, report, detail, transfers, cashFlow] = await Promise.all([
      getDistributionConfig(),
      getCommissionPercent(),
      getEnvelopes(),
      getDistributionReport(range),
      // Sobre abierto (?sobre=reserva): cada movimiento que forma su "Entró" y su "Salió".
      params.sobre ? getEnvelopeDetail(String(params.sobre)) : Promise.resolve(null),
      listEnvelopeTransfers(),
      getCashFlow(),
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
      <h2 className="dashboard-heading">Tu dinero hoy</h2>
      <MoneySummary envelopes={envelopes} cash={cashFlow.net} />

      <h3 className="envelope-section-title">¿Para qué es cada parte?</h3>
      <div className="envelope-grid">
        {orderedEnvelopes(envelopes.envelopes).map((e) => {
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
              <span className="hint">{envelopeNote(e, config)}</span>
              <span className="envelope-more">{open ? 'Ocultar ↑' : 'Ver detalle →'}</span>
            </Link>
          );
        })}
      </div>
      <p className="hint">
        Cada venta cobrada se reparte sola: lo que costó el perfume va a «Para reponer», la comisión a la vendedora y
        la ganancia {config.reinvestPercent}% a «Para crecer», {config.salaryPercent}% a «Tu sueldo» y{' '}
        {config.reservePercent}% al «Colchón».
      </p>
      {detail ? <EnvelopeDetail detail={detail} closeHref={hrefWith({ sobre: null })} /> : null}
      <EnvelopeTransfer
        balances={Object.fromEntries(envelopes.envelopes.map((e) => [e.key, e.balance]))}
        transfers={transfers}
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
