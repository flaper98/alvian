import Link from 'next/link';
import { getDashboardReport } from '@/lib/reports';
import { variation } from '@/lib/dashboard.mjs';
import { formatPercent, formatSoles } from '@/lib/money.mjs';
import { MonthlyBarsChart, ProfitLineChart } from './ProfitCharts';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** "↑ 12.5% vs. octubre 2026": verde si mejora, rojo si empeora (en gastos, subir es peor). */
function Change({ current, previous, compare, invert = false, points = false, count = false }) {
  if (!compare || previous == null) return null;
  let vs = `vs. ${compare.label}`;
  let direction;
  let text;
  if (points) {
    // El margen se compara en puntos porcentuales: 30% → 33% = +3 pts.
    if (current == null || previous == null) return <span className="kpi-delta">Sin ventas para comparar {vs}</span>;
    const diff = (current - previous) * 100;
    direction = Math.abs(diff) < 1 ? 'flat' : diff > 0 ? 'up' : 'down';
    text = `${Math.abs(diff).toLocaleString('es-PE', { maximumFractionDigits: 1 })} pts`;
  } else {
    const v = variation(current, previous);
    direction = v.direction;
    if (v.ratio == null) {
      // Antes fue 0, o se pasó de ganar a perder: se muestra el monto de antes.
      text = `desde ${count ? previous : formatSoles(previous)}`;
      vs = `en ${compare.label}`;
    } else {
      text = formatPercent(Math.abs(v.ratio));
    }
  }
  if (direction === 'flat') return <span className="kpi-delta">Sin cambio significativo {vs}</span>;
  const good = (direction === 'up') !== invert;
  return (
    <span className={`kpi-delta ${good ? 'is-good' : 'is-bad'}`}>
      {direction === 'up' ? '↑' : '↓'} {text} {vs}
    </span>
  );
}

function Kpi({ label, value, sub, tone, children }) {
  return (
    <div className={`kpi-tile${tone ? ` kpi-tile-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
      {children}
    </div>
  );
}

/** Una frase para saber en un segundo si el negocio va mejor o peor. */
function Verdict({ current, previous, compare }) {
  if (!compare || !previous) return null;
  const v = variation(current.profit, previous.profit);
  const when = `${compare.label}${compare.partial ? ' (a la misma fecha)' : ''}`;
  const before = `${previous.profit < 0 ? 'perdías' : 'ganabas'} ${formatSoles(Math.abs(previous.profit))}`;
  let text;
  if (current.profit < 0) {
    // Con pérdida, "ganando menos" confunde: se dice cuánto vas perdiendo y cuánto era antes.
    text = `Vas perdiendo ${formatSoles(Math.abs(current.profit))}; en ${when} ${before}`;
  } else {
    text = {
      up: `Estás ganando más que en ${when}`,
      down: `Estás ganando menos que en ${when}`,
      flat: `Estás ganando casi lo mismo que en ${when}`,
    }[v.direction];
    if (v.ratio != null && v.direction !== 'flat') text += ` (${v.ratio > 0 ? '+' : '−'}${formatPercent(Math.abs(v.ratio))})`;
    else if (v.ratio == null && v.direction !== 'flat') text += `: ${before}`;
  }
  return (
    <p className={`dash-verdict dash-verdict-${v.direction}`}>
      <span aria-hidden="true">{v.direction === 'up' ? '↑' : v.direction === 'down' ? '↓' : '→'}</span> {text}.
    </p>
  );
}

/**
 * Al inicio de un período en curso, los gastos fijos del mes (internet,
 * publicidad…) ya se registraron pero las ventas recién empiezan.
 */
function EarlyPeriodNote({ current, compare }) {
  if (!compare?.partial || current.profit >= 0 || current.general <= 0 || compare.days > 10) return null;
  return (
    <p className="hint">
      Llevas {compare.days} día{compare.days === 1 ? '' : 's'} del período: ya registraste {formatSoles(current.general)} de
      gastos generales, pero las ventas recién empiezan. Mira abajo «¿En qué se fueron los gastos?».
    </p>
  );
}

function TopSellers({ items }) {
  if (!items.length) return <p className="hint">No hay ventas registradas para este periodo.</p>;
  return (
    <div className="pivot-scroll">
      <table className="report-table dash-rank">
        <thead>
          <tr>
            <th scope="col">Perfume</th>
            <th scope="col" className="num">Unid.</th>
            <th scope="col" className="num">Facturado</th>
            <th scope="col" className="num">Participación</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={p.key}>
              <th scope="row">
                <span className="dash-rank-pos">{i + 1}</span> {p.name}
              </th>
              <td className="num">{p.units}</td>
              <td className="num">{formatSoles(p.revenue)}</td>
              <td className="num">
                <span className="dash-share">
                  <span className="dash-share-bar" aria-hidden="true">
                    <span style={{ width: `${Math.max(p.share * 100, 2)}%` }} />
                  </span>
                  {formatPercent(p.share)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopProfit({ items }) {
  if (!items.length) return <p className="hint">No hay ventas registradas para este periodo.</p>;
  return (
    <div className="pivot-scroll">
      <table className="report-table dash-rank">
        <thead>
          <tr>
            <th scope="col">Perfume</th>
            <th scope="col" className="num">Unid.</th>
            <th scope="col" className="num">Costo</th>
            <th scope="col" className="num">Venta</th>
            <th scope="col" className="num">Ganancia</th>
            <th scope="col" className="num">Margen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={p.key}>
              <th scope="row">
                <span className="dash-rank-pos">{i + 1}</span> {p.name}
                {p.costKnown ? null : <span className="dash-rank-note">Sin compra registrada: costo incompleto</span>}
              </th>
              <td className="num">{p.units}</td>
              <td className="num">{formatSoles(p.cost)}</td>
              <td className="num">{formatSoles(p.revenue)}</td>
              <td className={`num ${p.profit < 0 ? 'text-critical' : 'text-good'}`}>
                <strong>{formatSoles(p.profit)}</strong>
              </td>
              <td className="num">{formatPercent(p.margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Statement({ c }) {
  const rows = [
    { label: 'Ventas', value: c.revenue },
    { label: 'Costo de los productos vendidos', value: -c.cost },
    { label: 'Ganancia bruta', value: c.revenue - c.cost, total: true },
    { label: 'Comisiones de venta', value: -c.commission },
    { label: 'Envíos y otros costos de venta', value: -c.saleCosts },
    ...(c.tax > 0 ? [{ label: 'Impuestos', value: -c.tax }] : []),
    { label: 'Gastos generales', value: -c.general },
    { label: 'Pérdidas de mercadería', value: -c.losses },
    { label: 'Ganancia neta', value: c.profit, total: true },
  ];
  return (
    <table className="report-table sales-summary">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.total ? 'is-total' : undefined}>
            <th scope="row">{row.label}</th>
            <td className={`num${row.value < 0 ? ' text-critical' : ''}`}>{formatSoles(row.value)}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">Margen neto</th>
          <td className="num">{formatPercent(c.margin)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function ExpenseList({ items, total }) {
  if (!items.length) return <p className="hint">No hay gastos registrados en este periodo.</p>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.key}>
          <div className="bar-list-head">
            <span>{item.label}</span>
            <strong>{formatSoles(item.value)}</strong>
          </div>
          <div className="bar-list-track" title={`${item.label}: ${formatSoles(item.value)}`}>
            <span style={{ width: `${Math.max((item.value / max) * 100, 1.5)}%`, background: 'var(--series-out)' }} />
          </div>
          <span className="bar-list-sub">{formatPercent(total > 0 ? item.value / total : 0)} de los gastos</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Resumen de Reportes: cuánto vendiste, cuánto gastaste, cuánto ganaste y si
 * vas mejor o peor que antes. Datos reales de ventas, gastos y pérdidas.
 */
export default async function DashboardTab({ range }) {
  const r = await getDashboardReport(range);
  const c = r.current;
  const p = r.previous;
  const empty = c.sales === 0;

  return (
    <>
      <Verdict current={c} previous={p} compare={r.compare} />
      <EarlyPeriodNote current={c} compare={r.compare} />
      {empty ?<p className="dash-empty">No hay ventas registradas para este periodo.</p> : null}

      <div className="kpi-grid dash-kpis">
        <Kpi label="Ventas" value={formatSoles(c.revenue)} sub={plural(c.sales, 'venta', 'ventas')}>
          <Change current={c.revenue} previous={p?.revenue} compare={r.compare} />
        </Kpi>
        <Kpi
          label="Ganancia neta"
          value={formatSoles(c.profit)}
          sub="Ventas − costo − gastos"
          tone={c.profit < 0 ? 'bad' : 'good'}
        >
          <Change current={c.profit} previous={p?.profit} compare={r.compare} />
        </Kpi>
        <Kpi label="Gastos" value={formatSoles(c.expenses)} sub="De venta, generales y pérdidas">
          <Change current={c.expenses} previous={p?.expenses} compare={r.compare} invert />
        </Kpi>
        <Kpi
          label="Margen"
          value={formatPercent(c.margin)}
          sub={
            c.margin == null
              ? 'Sin ventas'
              : c.margin < 0
                ? `De cada S/ 100 vendidos pierdes ${formatSoles(Math.abs(c.margin) * 100)}`
                : `De cada S/ 100 vendidos te quedan ${formatSoles(c.margin * 100)}`
          }
        >
          <Change current={c.margin} previous={p?.margin} compare={r.compare} points />
        </Kpi>
        <Kpi
          label="Productos vendidos"
          value={c.units}
          sub={c.decants > 0 ? `${plural(c.bottles, 'frasco', 'frascos')} · ${plural(c.decants, 'decant', 'decants')}` : plural(c.units, 'perfume', 'perfumes')}
        >
          <Change current={c.units} previous={p?.units} compare={r.compare} count />
        </Kpi>
      </div>

      {c.withoutCost > 0 ? (
        <p className="hint dash-warning">
          {plural(c.withoutCost, 'venta', 'ventas')} de perfumes sin compra registrada: su costo cuenta como 0 y la
          ganancia real es menor. Regístralas en <Link href="/admin/compras">Compras</Link>.
        </p>
      ) : null}
      {r.cancelled.count > 0 ? (
        <p className="hint dash-warning">
          No se cuentan {plural(r.cancelled.count, 'venta', 'ventas')} ({formatSoles(r.cancelled.total)}) de pedidos web
          cancelados. Si ya no se venderán, elimínalas en <Link href="/admin/ventas">Ventas</Link> para devolver el stock.
        </p>
      ) : null}

      <div className="chart-card">
        <div className="dash-chart-head">
          <h3 className="chart-title">Evolución mensual de la ganancia neta</h3>
          <span className="hint">El fondo marca los meses del período elegido</span>
        </div>
        <ProfitLineChart months={r.months} />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Ventas, gastos y ganancia por mes</h3>
        <MonthlyBarsChart months={r.months} />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Productos más vendidos</h3>
          <TopSellers items={r.topSellers} />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">Productos con mayor ganancia</h3>
          <TopProfit items={r.topProfit} />
          <p className="hint">
            Ganancia = lo cobrado − su costo − comisión, envío e impuesto de esas ventas. Un perfume que vende mucho no
            siempre es el que más deja.
          </p>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Estado de resultados</h3>
          <Statement c={c} />
        </div>
        <div className="chart-card">
          <h3 className="chart-title">¿En qué se fueron los gastos?</h3>
          <ExpenseList items={r.expenseItems} total={c.expenses} />
        </div>
      </div>

      <p className="hint">
        Las ventas cuentan el día en que se registran, aunque sean a crédito. No son gastos: las compras de mercadería
        (se cuentan como costo cuando se venden), tus retiros y los pagos de deudas. Para ver el dinero que entró y salió,
        mira <Link href="/admin/reportes?vista=general">Flujo de caja</Link>.
      </p>
    </>
  );
}
