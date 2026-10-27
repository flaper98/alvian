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
  getCashPlan,
  parseSalesFilters,
} from '@/lib/reports';
import { MONTHS } from '@/lib/cash-plan.mjs';
import { CATEGORY_LABELS, GRANULARITIES, change } from '@/lib/sales-report.mjs';
import { ORDER_STATUSES, PAYMENT_METHODS } from '@/lib/store-config';
import { listPurchaseCosts } from '@/lib/db';
import { LEDGER_GROUPS, movementsHref, sectionOfSrc } from '@/lib/ledger-types';
import TrendChart from './TrendChart';
import LedgerTable from './LedgerTable';
import StockTable from './StockTable';
import { CustomersTable, ProductRanking, ProfitTable, SalesExport } from './SalesTables';

export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'general', label: 'General', dated: true },
  { key: 'ventas', label: 'Ventas', dated: true },
  { key: 'movimientos', label: 'Movimientos', dated: true },
  { key: 'plan', label: 'Plan de caja', dated: false },
  { key: 'cobrar', label: 'Por cobrar', dated: false },
  { key: 'inventario', label: 'Inventario', dated: false },
];

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

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
          {items.map((item) => {
            const body = (
              <>
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
              </>
            );
            // Con monto, la fila lleva al detalle: los movimientos que forman ese número.
            return (
              <li key={item.label}>
                {item.href && item.value > 0 ? (
                  <Link href={item.href} className="bar-list-link" aria-label={`Ver el detalle de ${item.label}`}>
                    {body}
                    <span className="bar-list-more">Ver detalle →</span>
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
      {footer ? <p className="hint">{footer}</p> : null}
    </div>
  );
}

function RangeFilters({ tab, range, params }) {
  const desde = range.start ? toDayString(range.start) : '';
  const hasta = range.end ? toDayString(new Date(range.end.getTime() - 1)) : '';
  // Si estás viendo el detalle de un tipo de movimiento, cambiar el período lo conserva.
  const tipo = tab === 'movimientos' && LEDGER_GROUPS[params.tipo] ? params.tipo : null;
  return (
    <div className="report-filters">
      <nav className="filter-chips" aria-label="Período">
        {Object.entries(REPORT_PRESETS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/reportes?vista=${tab}${tipo ? `&tipo=${tipo}` : ''}&periodo=${key}`}
            className={`filter-chip${range.preset === key ? ' active' : ''}`}
            aria-current={range.preset === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form className="report-range-form" method="get" action="/admin/reportes">
        <input type="hidden" name="vista" value={tab} />
        {tipo ? <input type="hidden" name="tipo" value={tipo} /> : null}
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

async function GeneralTab({ range, period }) {
  const r = await getOverviewReport(range);
  const buckets = labelBuckets(r.buckets, r.granularity);
  const withDetail = (items) => items.map((i) => ({ ...i, href: movementsHref(i.type, period) }));
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
        <TrendChart buckets={buckets} granularity={r.granularity} drillHref={movementsHref(null)} />
      </div>

      <div className="chart-grid">
        <BarList title="¿De dónde entró el dinero?" items={withDetail(r.incomeBySource)} color="var(--series-in)" />
        <BarList
          title="¿En qué se fue el dinero?"
          items={withDetail(r.outflowByType).map((i) => ({
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
        Toca una fila o una barra del gráfico para ver los movimientos que forman ese monto. Las cuotas de
        pandero de la semana en curso cuentan en los ingresos, pero no aparecen en el gráfico hasta que se
        entrega el número (todavía no tienen fecha de cierre).
      </p>
    </>
  );
}

const SALES_SERIES = [
  { key: 'revenue', label: 'Ventas', color: 'var(--series-in)' },
  { key: 'profit', label: 'Ganancia', color: 'var(--series-contado)' },
];
const CATEGORY_COLORS = ['var(--series-in)', 'var(--series-pandero)', 'var(--series-credito)', 'var(--series-out)'];
const STATUS_TONES = { pendiente: 'attention', cancelado: 'critical', entregado: 'good' };

/** "+12,5% vs. el mes anterior" (verde si sube, rojo si baja). */
function Delta({ current, previous, label }) {
  if (previous == null || !label) return null;
  const c = change(current, previous);
  if (c == null) return <span className="kpi-delta">{current > 0 ? `Nuevo frente a ${label}` : `Sin datos en ${label}`}</span>;
  const sign = c > 0 ? '+' : c < 0 ? '−' : '';
  const value = Math.abs(c * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 });
  return (
    <span className={`kpi-delta${c > 0 ? ' is-up' : c < 0 ? ' is-down' : ''}`}>
      {sign}
      {value}% respecto a {label}
    </span>
  );
}

function SalesKpi({ label, value, sub, current, previous, compare, tone }) {
  return (
    <div className={`kpi-tile${tone ? ` kpi-tile-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
      <Delta current={current} previous={previous} label={compare} />
    </div>
  );
}

/** Etiquetas del eje para día / semana / mes / año. */
function labelSalesBuckets(buckets, granularity) {
  return buckets.map((b) => {
    const [y, m = 1, d = 1] = b.key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const opts = { timeZone: 'UTC' };
    if (granularity === 'anio') return { ...b, label: String(y), fullLabel: `Año ${y}` };
    if (granularity === 'mes') {
      return {
        ...b,
        label: date.toLocaleDateString('es-PE', { ...opts, month: 'short' }).replace('.', '') + ` ${String(y).slice(2)}`,
        fullLabel: date.toLocaleDateString('es-PE', { ...opts, month: 'long', year: 'numeric' }),
      };
    }
    if (granularity === 'semana') {
      const short = date.toLocaleDateString('es-PE', { ...opts, day: 'numeric', month: 'short' }).replace('.', '');
      return { ...b, label: short, fullLabel: `Semana del ${short} ${y}` };
    }
    return {
      ...b,
      label: String(d),
      fullLabel: date.toLocaleDateString('es-PE', { ...opts, weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });
}

/** Filtros del reporte: período, fechas y los datos que existen en cada venta. */
function SalesFilters({ range, params, filters, options }) {
  const desde = range.start ? toDayString(range.start) : '';
  const hasta = range.end ? toDayString(new Date(range.end.getTime() - 1)) : '';
  // Cambiar de período conserva los demás filtros.
  const keep = new URLSearchParams(
    Object.entries({ ...filters, agrupar: params.agrupar }).filter(([, v]) => v),
  ).toString();
  return (
    <div className="report-filters sales-filters no-print">
      <nav className="filter-chips" aria-label="Período">
        {Object.entries(REPORT_PRESETS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/reportes?vista=ventas&periodo=${key}${keep ? `&${keep}` : ''}`}
            className={`filter-chip${range.preset === key ? ' active' : ''}`}
            aria-current={range.preset === key ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form className="sales-filter-form" method="get" action="/admin/reportes">
        <input type="hidden" name="vista" value="ventas" />
        {params.agrupar ? <input type="hidden" name="agrupar" value={params.agrupar} /> : null}
        {range.preset !== 'custom' ? <input type="hidden" name="periodo" value={range.preset} /> : null}
        <label>
          Desde
          <input type="date" name="desde" defaultValue={params.desde || (range.preset === 'custom' ? desde : '')} />
        </label>
        <label>
          Hasta
          <input type="date" name="hasta" defaultValue={params.hasta || (range.preset === 'custom' ? hasta : '')} />
        </label>
        <label>
          Categoría
          <select name="categoria" defaultValue={filters.categoria}>
            <option value="">Todas</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Producto
          <select name="producto" defaultValue={filters.producto}>
            <option value="">Todos</option>
            {options.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cliente
          <input type="search" name="cliente" list="sales-customers" placeholder="Nombre" defaultValue={filters.cliente} />
          <datalist id="sales-customers">
            {options.customers.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label>
          Método de pago
          <select name="metodo" defaultValue={filters.metodo}>
            <option value="">Todos</option>
            <option value="directa">Venta directa (en persona)</option>
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <option key={key} value={key}>
                Web · {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Forma de pago
          <select name="pago" defaultValue={filters.pago}>
            <option value="">Todas</option>
            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado del pedido
          <select name="estado" defaultValue={filters.estado}>
            <option value="">Todos</option>
            {Object.entries(ORDER_STATUSES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="sales-filter-actions">
          <button type="submit" className="btn-primary">
            Aplicar filtros
          </button>
          <Link href="/admin/reportes?vista=ventas" className="btn-secondary">
            Limpiar filtros
          </Link>
        </div>
      </form>
    </div>
  );
}

async function SalesTab({ range, params }) {
  const filters = parseSalesFilters(params);
  const r = await getSalesReport(range, filters, params.agrupar);
  const t = r.totals;
  const p = r.previous;
  const cmp = r.previousLabel;
  const buckets = labelSalesBuckets(r.trend, r.granularity);
  const filterQuery = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const periodQuery = new URLSearchParams(
    Object.entries({ periodo: params.periodo, desde: params.desde, hasta: params.hasta }).filter(([, v]) => v),
  ).toString();
  const groupHref = (key) =>
    `/admin/reportes?vista=ventas&agrupar=${key}${periodQuery ? `&${periodQuery}` : ''}${filterQuery ? `&${filterQuery}` : ''}`;
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const salesExpenses = t.commission + t.logistics + t.otherCosts;
  const ordersTotal = r.orderStatuses.reduce((sum, o) => sum + o.count, 0);
  const summary = [
    { label: 'Ingresos por ventas', value: t.revenue },
    { label: 'Costo de los productos', value: -t.cost },
    { label: 'Descuentos (no se registran)', value: 0 },
    { label: 'Devoluciones (no se aceptan)', value: 0 },
    { label: 'Comisiones', value: -t.commission },
    { label: 'Envío / logística', value: -t.logistics },
    { label: 'Otros costos de venta', value: -t.otherCosts },
    { label: 'Ganancia neta de ventas', value: t.profit },
  ];

  return (
    <>
      <SalesFilters range={range} params={params} filters={filters} options={r.options} />
      <div className="sales-toolbar">
        <p className="report-range-label">
          {rangeLabel(range)}
          {activeFilters ? ` · ${activeFilters} filtro${activeFilters === 1 ? '' : 's'}` : ''}
        </p>
        <div className="sales-toolbar-actions no-print">
          <SalesExport
            report={{ ...r, summary }}
            fileName={`ventas-${range.start ? toDayString(range.start) : 'inicio'}.csv`}
          />
        </div>
      </div>

      <div className="kpi-grid sales-kpis">
        <SalesKpi
          label="Ventas de hoy"
          value={soles(r.today.revenue)}
          sub={`${r.today.orders} pedido${r.today.orders === 1 ? '' : 's'}`}
          current={r.today.revenue}
          previous={r.yesterday.revenue}
          compare="ayer"
        />
        <SalesKpi label="Ventas del período" value={soles(t.revenue)} current={t.revenue} previous={p?.revenue} compare={cmp} />
        <SalesKpi
          label="Ganancia"
          value={soles(t.profit)}
          sub={`Margen ${percent(t.margin)}`}
          current={t.profit}
          previous={p?.profit}
          compare={cmp}
          tone={t.profit >= 0 ? 'good' : 'bad'}
        />
        <SalesKpi label="Pedidos" value={t.orders} current={t.orders} previous={p?.orders} compare={cmp} />
        <SalesKpi
          label="Ticket promedio"
          value={soles(t.averageTicket)}
          sub="Por pedido"
          current={t.averageTicket}
          previous={p?.averageTicket}
          compare={cmp}
        />
        <SalesKpi
          label="Más vendido"
          value={t.topProduct ? t.topProduct.name : '—'}
          sub={t.topProduct ? `${t.topProduct.units} unidades` : 'Sin ventas'}
        />
        <SalesKpi label="Unidades vendidas" value={t.units} current={t.units} previous={p?.units} compare={cmp} />
        <SalesKpi
          label="Clientes"
          value={t.customers}
          sub="Con nombre registrado"
          current={t.customers}
          previous={p?.customers}
          compare={cmp}
        />
      </div>
      {t.withoutCost > 0 ? (
        <p className="hint">
          {t.withoutCost} venta{t.withoutCost === 1 ? '' : 's'} de perfumes sin ninguna compra registrada: su costo
          cuenta como 0, así que la ganancia real es menor. Registra esas compras en «Compras».
        </p>
      ) : null}

      <div className="chart-card">
        <div className="sales-chart-head">
          <h3 className="chart-title">Evolución de ventas, ganancia y pedidos</h3>
          <nav className="filter-chips no-print" aria-label="Agrupar por">
            {Object.entries(GRANULARITIES).map(([key, label]) => (
              <Link
                key={key}
                href={groupHref(key)}
                className={`filter-chip${r.granularity === key ? ' active' : ''}`}
                aria-current={r.granularity === key ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <TrendChart
          buckets={buckets}
          granularity={r.granularity}
          series={SALES_SERIES}
          countKey="orders"
          countLabel="Pedidos"
          totalLabel={null}
          emptyText="No hubo ventas en este período."
          drillHref={`/admin/reportes?vista=ventas&agrupar=dia${filterQuery ? `&${filterQuery}` : ''}`}
          detailText="Toca para ver ese período"
        />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Ranking de productos</h3>
        <ProductRanking products={r.products} />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Rentabilidad por producto</h3>
        <ProfitTable products={r.products} />
        <p className="hint">
          Costo = lo que te costó cada frasco al venderlo (o el promedio de tus compras). Ganancia = ingreso − costo −
          comisión − envío y otros costos de esa venta.
        </p>
      </div>

      <div className="chart-grid">
        <BarList
          title="Ventas por categoría"
          items={r.categories.map((c, i) => ({
            label: `${c.label} · ${percent(c.share)}`,
            value: c.revenue,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            sub: `${c.units} unidades · ganancia ${soles(c.profit)}`,
          }))}
        />
        <div className="chart-card">
          <h3 className="chart-title">Métodos de pago</h3>
          {r.methods.length === 0 ? (
            <p className="hint">Sin ventas en este período.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Método</th>
                  <th scope="col" className="num">
                    Operaciones
                  </th>
                  <th scope="col" className="num">
                    Monto
                  </th>
                  <th scope="col" className="num">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.methods.map((m) => (
                  <tr key={m.label}>
                    <th scope="row">{m.label}</th>
                    <td className="num">{m.count}</td>
                    <td className="num">{soles(m.revenue)}</td>
                    <td className="num">{percent(m.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint">En las ventas en persona solo se guarda si fue contado, crédito o pandero.</p>
        </div>
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Clientes</h3>
        <CustomersTable customers={r.customers} />
        <p className="hint">
          Mejor cliente: los 3 que más te compraron. Nuevo: su primera compra fue en este período. Recurrente: ya te
          había comprado o compró más de una vez.
        </p>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Pedidos web por estado</h3>
          {ordersTotal === 0 ? (
            <p className="hint">No hubo pedidos de la tienda web en este período.</p>
          ) : (
            <ul className="order-status-list">
              {r.orderStatuses.map((o) => (
                <li key={o.key} className={`order-status-${STATUS_TONES[o.key] || 'neutral'}`}>
                  <span>{o.label}</span>
                  <strong>{o.count}</strong>
                  <span className="hint">{soles(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="hint">Solo los pedidos de la tienda web tienen estado; las ventas en persona no.</p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Resumen financiero</h3>
          <table className="report-table sales-summary">
            <tbody>
              {summary.map((s, i) => (
                <tr key={s.label} className={i === summary.length - 1 ? 'is-total' : undefined}>
                  <th scope="row">{s.label}</th>
                  <td className={`num${s.value < 0 || (i === summary.length - 1 && s.value < 0) ? ' text-critical' : ''}`}>
                    {soles(s.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">
            Gastos de venta: {soles(salesExpenses)}. El sistema no registra descuentos y no aceptas devoluciones, por eso
            van en 0.
          </p>
        </div>
      </div>

      <div className="chart-grid">
        <BarList
          title="Por canal"
          items={r.channels.map((c) => ({ label: `${c.label} · ${c.count}`, value: c.revenue }))}
          color="var(--series-in)"
        />
        <BarList
          title="Por quién vendió"
          items={r.sellers.map((s) => ({
            label: `${s.label} · ${s.count}`,
            value: s.revenue,
            sub: s.commission > 0 ? `Comisión ${soles(s.commission)}` : null,
          }))}
          color="var(--series-credito)"
        />
      </div>
    </>
  );
}

// Además de la sección del tipo, un atajo útil según lo que estás mirando.
const RELATED_LINKS = {
  venta: { label: 'Ver qué perfumes se vendieron', view: 'ventas', dated: true },
  abono: { label: 'Ver quién te debe todavía', view: 'cobrar', dated: false },
  compra: { label: 'Ver la mercadería que tienes', view: 'inventario', dated: false },
};

/** Encabezado del detalle de un tipo: cuánto suma, cuántos movimientos y a dónde ir. */
function MovementsFocus({ group, rows, period }) {
  const info = LEDGER_GROUPS[group];
  const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
  const related = RELATED_LINKS[group];
  const query = new URLSearchParams(Object.entries(period).filter(([, v]) => v)).toString();
  return (
    <div className="movements-focus">
      <div>
        <span className="kpi-label">Detalle de</span>
        <strong className="movements-focus-title">{info.label}</strong>
        <span className="hint">
          {rows.length} movimiento{rows.length === 1 ? '' : 's'} · {soles(total)}
        </span>
      </div>
      <div className="movements-focus-links">
        {related ? (
          <Link
            className="btn-primary"
            href={`/admin/reportes?vista=${related.view}${related.dated && query ? `&${query}` : ''}`}
          >
            {related.label} →
          </Link>
        ) : null}
        <Link className="btn-secondary" href={info.section}>
          Ir a {info.sectionLabel} →
        </Link>
        <Link className="btn-secondary" href={movementsHref(null, period)}>
          Ver todos los movimientos
        </Link>
      </div>
    </div>
  );
}

async function MovementsTab({ range, tipo, period }) {
  const group = LEDGER_GROUPS[tipo] ? tipo : null;
  const rows = await getLedger(range, 3000, {
    includeCapital: group === 'aporte',
    srcs: group ? LEDGER_GROUPS[group].srcs : null,
  });
  const data = rows.map((r) => ({
    kind: r.kind,
    category: r.category,
    detail: r.detail,
    amount: r.amount,
    dateLabel: dateTimeFmt.format(new Date(r.t)),
    src: r.src,
    ref: r.ref,
    // Cada movimiento lleva a su sección (la venta, el crédito, la compra…).
    href: sectionOfSrc(r.src),
  }));
  const from = range.start ? toDayString(range.start) : 'inicio';
  const to = range.end ? toDayString(new Date(range.end.getTime() - 1)) : 'hoy';
  return (
    <>
      {group ? <MovementsFocus group={group} rows={rows} period={period} /> : null}
      <LedgerTable
        rows={data}
        fileName={`movimientos-${group ? `${group}-` : ''}${from}-a-${to}.csv`}
        truncated={rows.length >= 3000}
      />
    </>
  );
}

/** Año del plan desde ?anio=; por defecto el año actual en Lima. */
function planYear(value) {
  const current = Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'America/Lima' }).format(new Date()));
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= current ? year : current;
}

/** Una fila del plan: etiqueta, los 12 meses (vacío si el mes aún no llega) y el total. */
function PlanRow({ label, values, total, className, href }) {
  const cell = (v) => (v === null ? '' : money(v));
  return (
    <tr className={className}>
      <th scope="row">{href ? <Link href={href}>{label}</Link> : label}</th>
      {values.map((v, i) => (
        <td key={i} className={`num${v !== null && v < 0 ? ' is-neg' : ''}`}>
          {cell(v)}
        </td>
      ))}
      <td className={`num plan-total${total < 0 ? ' is-neg' : ''}`}>{cell(total)}</td>
    </tr>
  );
}

const money = (value) =>
  `${value < 0 ? '−' : ''}${Math.abs(Number(value) || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

async function CashPlanTab({ year }) {
  const plan = await getCashPlan(year);
  const head = (title) => (
    <tr className="plan-head">
      <th scope="col">{title}</th>
      {MONTHS.map((m) => (
        <th scope="col" className="num" key={m}>
          {m}
        </th>
      ))}
      <th scope="col" className="num">
        Total
      </th>
    </tr>
  );
  const yearHref = (y) => `/admin/reportes?vista=plan&anio=${y}`;
  // Cada fila de egreso abre sus movimientos en «Movimientos» (grupo de lib/ledger-types.js).
  const typeHref = (key) => {
    const group = key.startsWith('gasto') ? 'gasto' : ['impuestos', 'reserva'].includes(key) ? 'otras' : key;
    return movementsHref(group, { desde: `${year}-01-01`, hasta: `${year}-12-31` });
  };
  return (
    <>
      <div className="report-filters">
        <nav className="filter-chips" aria-label="Año">
          {plan.years.map((y) => (
            <Link
              key={y}
              href={yearHref(y)}
              className={`filter-chip${y === year ? ' active' : ''}`}
              aria-current={y === year ? 'page' : undefined}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>
      <div className="kpi-grid">
        <Kpi label="Caja al 1 de enero" value={soles(plan.totals.opening)} />
        <Kpi label="Entró en el año" value={soles(plan.totals.income - plan.totals.opening)} tone="good" />
        <Kpi label="Salió en el año" value={soles(plan.totals.outflow)} />
        <Kpi
          label="Saldo de caja"
          value={soles(plan.totals.closing)}
          sub="Al último mes del plan"
          tone={plan.totals.closing < 0 ? 'bad' : 'good'}
        />
      </div>
      <div className="pivot-scroll plan-scroll">
        <table className="report-table cash-plan">
          <tbody className="plan-in">
            {head('Ingresos')}
            <PlanRow label="Saldo del mes anterior" values={plan.opening} total={plan.totals.opening} className="plan-opening" />
            {plan.income.map((l) => (
              <PlanRow key={l.key} label={l.label} values={l.values} total={l.total} />
            ))}
            <PlanRow label="Total de ingresos" values={plan.incomeTotals} total={plan.totals.income} className="plan-sum" />
          </tbody>
          <tbody className="plan-out">
            {head('Egresos')}
            {plan.outflow.length === 0 ? (
              <tr>
                <td colSpan={14} className="hint">
                  No hubo salidas en {year}.
                </td>
              </tr>
            ) : (
              plan.outflow.map((l) => (
                <PlanRow key={l.key} label={l.label} values={l.values} total={l.total} href={typeHref(l.key)} />
              ))
            )}
            <PlanRow label="Total de egresos" values={plan.outflowTotals} total={plan.totals.outflow} className="plan-sum" />
          </tbody>
          <tbody className="plan-balance">
            <PlanRow
              label="Saldo del mes (ingresos − egresos)"
              values={plan.closing}
              total={plan.totals.closing}
              className="plan-sum"
            />
          </tbody>
        </table>
      </div>
      <p className="hint">
        Montos en soles, con lo que registraste en el sistema. El saldo de cada mes pasa como «saldo del mes anterior»
        al siguiente. Toca una fila de egresos para ver sus movimientos.
      </p>
    </>
  );
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

/**
 * Perfumes sin stock como lista: foto (o "Sin foto": no se ve en la tienda),
 * a cuánto lo compras y a quién, a cuánto lo vendes y un botón para comprarlo.
 */
function OutOfStockGroup({ title, items, costs }) {
  if (!items.length) return null;
  const round = (value) => `S/ ${Math.round(Number(value) || 0).toLocaleString('es-PE')}`;
  const hidden = items.filter((p) => !p.image).length;
  return (
    <details className="stock-out" open={title === 'Nunca comprados'}>
      <summary>
        <span className="stock-out-title">
          {title}
          <small>
            {items.length - hidden} en la tienda{hidden ? ` · ${hidden} sin foto` : ''}
          </small>
        </span>
        <strong>{items.length}</strong>
      </summary>
      <ul className="stock-out-list">
        {items.map((p) => {
          const supplier = costs[p.id]?.supplier || null;
          const cost = p.unitCost ?? supplier?.price ?? null;
          const note = supplier ? `&note=${encodeURIComponent(`${supplier.name} · ${supplier.tier}`)}` : '';
          const buyHref = cost != null ? `/admin/compras?perfumeId=${p.id}&unitCost=${cost}${note}` : '/admin/proveedores';
          return (
            <li key={p.id}>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" width={36} height={36} loading="lazy" />
              ) : (
                <Link href="/admin/catalogo?filtro=sin-imagen" className="stock-out-nophoto" title="Sube su foto para que se vea en la tienda">
                  Sin foto
                </Link>
              )}
              <div className="stock-out-info">
                <strong>{p.name}</strong>
                <span>
                  {cost != null ? `Compra ${round(cost)}` : 'Sin precio de compra'}
                  {supplier ? ` · ${supplier.name}` : ''} · Venta {round(p.price)}
                </span>
              </div>
              <Link href={buyHref} className="stock-out-buy">
                Comprar
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

async function InventoryTab() {
  // Precio de compra (o del proveedor, si nunca lo compraste) para la lista "Sin stock".
  const [r, costs] = await Promise.all([getInventoryReport(), listPurchaseCosts()]);
  const s = r.sellOut;
  const round = (value) => `S/ ${Math.round(Number(value) || 0).toLocaleString('es-PE')}`;
  const parts = [
    { key: 'capital', label: 'Costo', value: s.capital },
    { key: 'profit', label: 'Ganancia', value: Math.max(s.profit, 0) },
    { key: 'costs', label: 'Comisión', value: s.commission + s.tax },
  ];
  const partsTotal = parts.reduce((sum, p) => sum + p.value, 0);
  const share = (value) => (partsTotal > 0 ? Math.round((value / partsTotal) * 100) : 0);

  return (
    <>
      <div className="kpi-grid">
        <Kpi
          label="Frascos en stock"
          value={r.units.toLocaleString('es-PE')}
          sub={`${r.items.length} perfume${r.items.length === 1 ? '' : 's'}`}
        />
        <Kpi
          label="Te costaron"
          value={soles(r.costValue)}
          sub={r.decantValue > 0 ? `incluye ${round(r.decantValue)} en decants` : null}
        />
        <Kpi label="Valen" value={soles(r.retailValue)} sub="a precio de venta" />
        <Kpi label="Ganarías" value={soles(s.profit)} sub={`margen ${s.marginPercent}%`} tone="good" />
      </div>

      {partsTotal > 0 ? (
        <div className="split stock-split" role="img" aria-label={parts.map((p) => `${p.label} ${share(p.value)}%`).join(', ')}>
          <div className="split-bar">
            {parts.map((p) =>
              p.value > 0 ? (
                <span key={p.key} className={`split-${p.key}`} style={{ width: `${(p.value / partsTotal) * 100}%` }} />
              ) : null,
            )}
          </div>
          <ul className="split-legend" aria-hidden="true">
            {parts.map((p) => (
              <li key={p.key}>
                <span className={`split-dot split-${p.key}`} />
                {p.label} <strong>{share(p.value)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="chart-card">
        <h3 className="chart-title">Tu stock</h3>
        <StockTable items={r.items} />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <div className="stock-side-head">
            <h3 className="chart-title">Por reponer</h3>
            <Link href="/admin/plan#comprar" className="btn-secondary">
              Qué comprar →
            </Link>
          </div>
          {r.restock.length === 0 ? (
            <p className="stock-empty">✓ Todo bien por ahora</p>
          ) : (
            <ul className="stock-mini-list">
              {r.restock.map((p) => (
                <li key={p.id}>
                  <span className="stock-mini-name">{p.name}</span>
                  <span className={`stock-mini-tag ${p.stock === 0 ? 'is-out' : 'is-low'}`}>
                    {p.stock === 0 ? 'Agotado' : `Quedan ${p.stock}`}
                  </span>
                  <span className="stock-mini-note">{p.sold30} vendidos/mes</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="chart-card">
          <div className="stock-side-head">
            <h3 className="chart-title">Sin stock</h3>
            <Link href="/admin/proveedores" className="btn-secondary">
              Proveedores →
            </Link>
          </div>
          {r.outIdle.length === 0 && r.neverBought.length === 0 ? (
            <p className="stock-empty">✓ Nada sin stock</p>
          ) : (
            <div className="stock-out-groups">
              <OutOfStockGroup title="Nunca comprados" items={r.neverBought} costs={costs} />
              <OutOfStockGroup title="Ya no se piden" items={r.outIdle} costs={costs} />
            </div>
          )}
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
  // El período elegido viaja a los enlaces de detalle para ver los mismos movimientos.
  const period = { periodo: params.periodo, desde: params.desde, hasta: params.hasta };
  const query = new URLSearchParams(Object.entries(period).filter(([, v]) => v)).toString();

  let content;
  try {
    if (tab.key === 'general') content = await GeneralTab({ range, period });
    else if (tab.key === 'ventas') content = await SalesTab({ range, params });
    else if (tab.key === 'movimientos') content = await MovementsTab({ range, tipo: params.tipo, period });
    else if (tab.key === 'plan') content = await CashPlanTab({ year: planYear(params.anio) });
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

      {tab.key === 'ventas' ? null : tab.key === 'plan' ? (
        <p className="report-range-label">Plan de caja por meses · elige el año</p>
      ) : tab.dated ? (
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
