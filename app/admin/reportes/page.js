import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import {
  REPORT_PRESETS,
  resolveReportRange,
  toDayString,
  getOverviewReport,
  getSalesReport,
  getLedger,
  getReceivablesReport,
  getInventoryReport,
} from '@/lib/reports';
import TrendChart from './TrendChart';
import LedgerTable from './LedgerTable';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'general', label: 'General', dated: true },
  { key: 'ventas', label: 'Ventas', dated: true },
  { key: 'movimientos', label: 'Movimientos', dated: true },
  { key: 'cobrar', label: 'Por cobrar', dated: false },
  { key: 'inventario', label: 'Inventario', dated: false },
];

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };
const PAYMENT_COLORS = {
  contado: 'var(--series-contado)',
  credito: 'var(--series-credito)',
  pandero: 'var(--series-pandero)',
};

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
const percent = (value) => `${Math.round(value * 100)}%`;

const dateFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const dateTimeFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' });

/** Etiquetas del eje: el mes o el día (corta) y su versión completa (tooltip/tabla). */
function labelBuckets(buckets, granularity) {
  return buckets.map((b) => {
    const [y, m, d = 1] = b.key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const opts = { timeZone: 'UTC' };
    if (granularity === 'day') {
      return {
        ...b,
        label: String(d),
        fullLabel: date.toLocaleDateString('es-PE', { ...opts, weekday: 'short', day: 'numeric', month: 'short' }),
      };
    }
    return {
      ...b,
      label: date.toLocaleDateString('es-PE', { ...opts, month: 'short' }).replace('.', '') + ` ${String(y).slice(2)}`,
      fullLabel: date.toLocaleDateString('es-PE', { ...opts, month: 'long', year: 'numeric' }),
    };
  });
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={`kpi-tile${tone ? ` kpi-tile-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  );
}

/** Barras horizontales de una sola serie; el valor va en la punta de cada barra. */
function BarList({ title, items, color, footer }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {total <= 0 ? (
        <p className="hint">Sin movimientos en este período.</p>
      ) : (
        <ul className="bar-list">
          {items.map((item) => (
            <li key={item.label}>
              <div className="bar-list-head">
                <span>{item.label}</span>
                <strong>{soles(item.value)}</strong>
              </div>
              <div className="bar-list-track" title={`${item.label}: ${soles(item.value)}`}>
                <span
                  style={{
                    width: `${max > 0 ? Math.max((item.value / max) * 100, item.value > 0 ? 1.5 : 0) : 0}%`,
                    background: item.color || color,
                  }}
                />
              </div>
              {item.sub ? <span className="bar-list-sub">{item.sub}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {footer ? <p className="hint">{footer}</p> : null}
    </div>
  );
}

function RangeFilters({ tab, range, params }) {
  const desde = range.start ? toDayString(range.start) : '';
  const hasta = range.end ? toDayString(new Date(range.end.getTime() - 1)) : '';
  return (
    <div className="report-filters">
      <nav className="filter-chips" aria-label="Período">
        {Object.entries(REPORT_PRESETS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/reportes?vista=${tab}&periodo=${key}`}
            className={`filter-chip${range.preset === key ? ' active' : ''}`}
            aria-current={range.preset === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form className="report-range-form" method="get" action="/admin/reportes">
        <input type="hidden" name="vista" value={tab} />
        <label>
          Desde
          <input type="date" name="desde" defaultValue={params.desde || desde} />
        </label>
        <label>
          Hasta
          <input type="date" name="hasta" defaultValue={params.hasta || hasta} />
        </label>
        <button type="submit" className={`btn-secondary${range.preset === 'custom' ? ' is-active' : ''}`}>
          Aplicar
        </button>
      </form>
    </div>
  );
}

function rangeLabel(range) {
  if (!range.start && !range.end) return 'Desde el inicio';
  const from = range.start ? dateFmt.format(range.start) : 'el inicio';
  const to = range.end ? dateFmt.format(new Date(range.end.getTime() - 1)) : 'hoy';
  return `${from} – ${to}`;
}

// ---------- Pestañas ----------

async function GeneralTab({ range }) {
  const r = await getOverviewReport(range);
  const buckets = labelBuckets(r.buckets, r.granularity);
  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Ingresos" value={soles(r.income)} sub="Dinero cobrado" />
        <Kpi label="Salidas" value={soles(r.outflow)} sub="Compras, gastos, comisiones, retiros y deudas" />
        <Kpi
          label="Resultado"
          value={soles(r.result)}
          sub={r.result >= 0 ? 'Entró más de lo que salió' : 'Salió más de lo que entró'}
          tone={r.result >= 0 ? 'good' : 'bad'}
        />
        <Kpi label="Aportes de capital" value={soles(r.capitalIn)} sub="No cuentan como ingreso" />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Ingresos y salidas {r.granularity === 'day' ? 'por día' : 'por mes'}</h3>
        <TrendChart buckets={buckets} granularity={r.granularity} />
      </div>

      <div className="chart-grid">
        <BarList title="¿De dónde entró el dinero?" items={r.incomeBySource} color="var(--series-in)" />
        <BarList
          title="¿En qué se fue el dinero?"
          items={r.outflowByType.map((i) => ({
            ...i,
            sub: i.capital > 0 ? `${soles(i.capital)} pagado con capital (tu bolsillo)` : null,
          }))}
          color="var(--series-out)"
          footer={
            r.losses.total > 0
              ? `Además se perdieron ${r.losses.units} unidades de mercadería (${soles(r.losses.total)} al costo). No es dinero que salió, pero sí mercadería que ya no venderás.`
              : null
          }
        />
      </div>
      <p className="hint">
        Las cuotas de pandero de la semana en curso cuentan en los ingresos, pero no aparecen en el
        gráfico hasta que se entrega el número (todavía no tienen fecha de cierre).
      </p>
    </>
  );
}

async function SalesTab({ range }) {
  const r = await getSalesReport(range);
  const maxTop = Math.max(...r.top.map((t) => t.revenue), 0);
  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Ventas" value={soles(r.revenue)} sub={`${r.count} ventas · ${r.units} unidades`} />
        <Kpi
          label="Ganancia bruta"
          value={soles(r.grossProfit)}
          sub={`Margen ${percent(r.margin)} · ventas − costo − comisiones`}
          tone={r.grossProfit >= 0 ? 'good' : 'bad'}
        />
        <Kpi label="Ticket promedio" value={soles(r.averageTicket)} sub="Por venta" />
        <Kpi label="Comisiones generadas" value={soles(r.commissions)} sub="Pagadas o por pagar" />
      </div>
      {r.withoutCost > 0 ? (
        <p className="hint">
          {r.withoutCost} venta{r.withoutCost === 1 ? '' : 's'} de perfumes sin ninguna compra registrada: su
          costo cuenta como 0, así que la ganancia real es menor. Registra esas compras en «Compras».
        </p>
      ) : null}

      <div className="chart-card">
        <h3 className="chart-title">Perfumes más vendidos</h3>
        {r.top.length === 0 ? (
          <p className="hint">No hubo ventas en este período.</p>
        ) : (
          <div className="pivot-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Perfume</th>
                  <th scope="col" className="num">
                    Unid.
                  </th>
                  <th scope="col">Ventas</th>
                  <th scope="col" className="num">
                    Ganancia
                  </th>
                  <th scope="col" className="num">
                    Margen
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.top.map((t) => (
                  <tr key={t.id}>
                    <th scope="row">{t.name}</th>
                    <td className="num">{t.units}</td>
                    <td>
                      <div className="inline-bar">
                        <span style={{ width: `${maxTop > 0 ? (t.revenue / maxTop) * 100 : 0}%` }} />
                        <strong>{soles(t.revenue)}</strong>
                      </div>
                    </td>
                    <td className="num">{t.profit == null ? <span className="hint">Sin costo</span> : soles(t.profit)}</td>
                    <td className="num">
                      {t.margin == null ? '—' : (
                        <span className={t.margin < 0.2 ? 'text-critical' : ''}>{percent(t.margin)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="chart-grid">
        <BarList
          title="Por forma de pago"
          items={r.payments.map((p) => ({
            label: `${PAYMENT_LABELS[p.key] || p.key} · ${p.count}`,
            value: p.revenue,
            color: PAYMENT_COLORS[p.key],
          }))}
        />
        <BarList
          title="Por canal"
          items={r.channels.map((c) => ({ label: `${c.label} · ${c.count}`, value: c.revenue }))}
          color="var(--series-in)"
        />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Por quién vendió</h3>
        {r.sellers.length === 0 ? (
          <p className="hint">No hubo ventas en este período.</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Vendió</th>
                <th scope="col" className="num">
                  Ventas
                </th>
                <th scope="col" className="num">
                  Monto
                </th>
                <th scope="col" className="num">
                  Comisión
                </th>
              </tr>
            </thead>
            <tbody>
              {r.sellers.map((s) => (
                <tr key={s.label}>
                  <th scope="row">{s.label}</th>
                  <td className="num">{s.count}</td>
                  <td className="num">{soles(s.revenue)}</td>
                  <td className="num">{s.commissions > 0 ? soles(s.commissions) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

async function MovementsTab({ range }) {
  const rows = await getLedger(range);
  const data = rows.map((r) => ({
    kind: r.kind,
    category: r.category,
    detail: r.detail,
    amount: r.amount,
    dateLabel: dateTimeFmt.format(new Date(r.t)),
  }));
  const from = range.start ? toDayString(range.start) : 'inicio';
  const to = range.end ? toDayString(new Date(range.end.getTime() - 1)) : 'hoy';
  return <LedgerTable rows={data} fileName={`movimientos-${from}-a-${to}.csv`} truncated={rows.length >= 3000} />;
}

async function ReceivablesTab() {
  const r = await getReceivablesReport();
  const overdue = r.ages.filter((a) => a.key === '61-90' || a.key === '90+').reduce((sum, a) => sum + a.total, 0);
  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Te deben" value={soles(r.total)} sub={`${r.customers.length} cliente${r.customers.length === 1 ? '' : 's'}`} />
        <Kpi
          label="Con más de 60 días"
          value={soles(overdue)}
          sub="Prioriza estos cobros"
          tone={overdue > 0 ? 'bad' : 'good'}
        />
      </div>
      <div className="chart-grid">
        <BarList
          title="Antigüedad de la deuda"
          items={r.ages.map((a) => ({ label: `${a.label} · ${a.count}`, value: a.total }))}
          color="var(--series-credito)"
        />
        <div className="chart-card">
          <h3 className="chart-title">Quién te debe</h3>
          {r.customers.length === 0 ? (
            <p className="hint">Nadie te debe. 🎉</p>
          ) : (
            <div className="pivot-scroll report-scroll-sm">
              <table className="report-table">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col" className="num">
                      Debe
                    </th>
                    <th scope="col" className="num">
                      Antigüedad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.customers.map((c) => (
                    <tr key={c.name}>
                      <th scope="row">
                        {c.name}
                        <span className="report-sub">{c.items.join(', ')}</span>
                      </th>
                      <td className="num">{soles(c.balance)}</td>
                      <td className="num">
                        <span className={c.oldestDays > 60 ? 'badge badge-debt' : ''}>{c.oldestDays} días</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/admin/creditos" className="chart-footnote">
            Registrar abonos en «Por cobrar» →
          </Link>
        </div>
      </div>
    </>
  );
}

async function InventoryTab() {
  const r = await getInventoryReport();
  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Unidades en stock" value={r.units.toLocaleString('es-PE')} />
        <Kpi label="Invertido en stock" value={soles(r.costValue)} sub="Valor al costo de compra" />
        <Kpi label="Valor a precio de venta" value={soles(r.retailValue)} />
        <Kpi label="Ganancia si vendes todo" value={soles(r.potentialProfit)} tone="good" />
      </div>
      {r.withoutCost > 0 ? (
        <p className="hint">
          {r.withoutCost} perfume{r.withoutCost === 1 ? '' : 's'} con stock no tiene{r.withoutCost === 1 ? '' : 'n'} compra
          registrada: no suman al costo ni a la ganancia potencial.
        </p>
      ) : null}

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Sin vender hace más de {r.dormantDays} días</h3>
          {r.dormant.length === 0 ? (
            <p className="hint">Todo tu stock se está moviendo.</p>
          ) : (
            <div className="pivot-scroll report-scroll-sm">
              <table className="report-table">
                <thead>
                  <tr>
                    <th scope="col">Perfume</th>
                    <th scope="col" className="num">
                      Stock
                    </th>
                    <th scope="col" className="num">
                      Sin venta
                    </th>
                    <th scope="col" className="num">
                      Dinero parado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {r.dormant.map((d) => (
                    <tr key={d.name}>
                      <th scope="row">{d.name}</th>
                      <td className="num">{d.stock}</td>
                      <td className="num">{d.idleDays == null ? 'Nunca' : `${d.idleDays} días`}</td>
                      <td className="num">{d.tied == null ? '—' : soles(d.tied)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="hint">Considera una promoción o destacarlos en la portada.</p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Reponer</h3>
          <h4 className="report-subtitle">Quedan 3 o menos ({r.low.length})</h4>
          {r.low.length === 0 ? (
            <p className="hint">Ninguno.</p>
          ) : (
            <ul className="report-chips">
              {r.low.map((p) => (
                <li key={p.name}>
                  {p.name} <strong>{p.stock}</strong>
                </li>
              ))}
            </ul>
          )}
          <h4 className="report-subtitle">Agotados ({r.out.length})</h4>
          {r.out.length === 0 ? (
            <p className="hint">Ninguno.</p>
          ) : (
            <ul className="report-chips">
              {r.out.map((p) => (
                <li key={p.name}>{p.name}</li>
              ))}
            </ul>
          )}
          <p className="hint">
            La tienda los sigue vendiendo como disponibles: si entra un pedido, compra al proveedor.
          </p>
          <Link href="/admin/proveedores" className="chart-footnote">
            Ver dónde conviene comprar →
          </Link>
        </div>
      </div>
    </>
  );
}

export default async function ReportesPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const tab = TABS.find((t) => t.key === params.vista) || TABS[0];
  const range = resolveReportRange(params);
  const query = new URLSearchParams(
    Object.entries({ periodo: params.periodo, desde: params.desde, hasta: params.hasta }).filter(([, v]) => v),
  ).toString();

  let content;
  try {
    if (tab.key === 'general') content = await GeneralTab({ range });
    else if (tab.key === 'ventas') content = await SalesTab({ range });
    else if (tab.key === 'movimientos') content = await MovementsTab({ range });
    else if (tab.key === 'cobrar') content = await ReceivablesTab();
    else content = await InventoryTab();
  } catch (error) {
    content = <p className="form-error">{error.message}</p>;
  }

  return (
    <section className="admin-section reports">
      <div className="admin-header">
        <h1>Reportes</h1>
      </div>

      <nav className="status-tabs" aria-label="Reporte">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reportes?vista=${t.key}${query ? `&${query}` : ''}`}
            className={`status-tab${tab.key === t.key ? ' active' : ''}`}
            aria-current={tab.key === t.key ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab.dated ? (
        <>
          <RangeFilters tab={tab.key} range={range} params={params} />
          <p className="report-range-label">{rangeLabel(range)}</p>
        </>
      ) : (
        <p className="report-range-label">Situación al día de hoy · no depende del período</p>
      )}

      <div className="report-body">{content}</div>
    </section>
  );
}
