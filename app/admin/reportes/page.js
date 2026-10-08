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
import { listPurchaseCosts } from '@/lib/db';
import { LEDGER_GROUPS, movementsHref, sectionOfSrc } from '@/lib/ledger-types';
import TrendChart from './TrendChart';
import LedgerTable from './LedgerTable';
import StockTable from './StockTable';

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
    else if (tab.key === 'ventas') content = await SalesTab({ range });
    else if (tab.key === 'movimientos') content = await MovementsTab({ range, tipo: params.tipo, period });
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
