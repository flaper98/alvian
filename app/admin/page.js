import { getCurrentRole } from '@/lib/session';
import Link from 'next/link';
import { getSummary, listPendingDeliveries, PERIODS } from '@/lib/db';
import { countWebOrdersByStatus } from '@/lib/store-db';
import { IconReceipt, IconCoin, IconClock, IconWallet } from './icons';
import PendingDeliveryRow from './PendingDeliveryRow';

export const dynamic = 'force-dynamic';

const money = (value) => {
  const n = Number(value);
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function StatTile({ icon, label, value, tone }) {
  return (
    <div className={`stat-tile${tone ? ` stat-tile-${tone}` : ''}`}>
      <span className="stat-tile-icon">{icon}</span>
      <div className="stat-tile-body">
        <span className="stat-tile-label">{label}</span>
        <strong className="stat-tile-value">{value}</strong>
      </div>
    </div>
  );
}

function KpiTile({ label, value, sub, tone }) {
  return (
    <div className={`kpi-tile${tone ? ` kpi-tile-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function AttentionTile({ href, label, value, hint, active }) {
  return (
    <Link href={href} className={`attention-tile${active ? ' attention-tile-active' : ''}`}>
      <span className="attention-tile-label">{label}</span>
      <strong className="attention-tile-value">{value}</strong>
      <span className="attention-tile-hint">{hint} →</span>
    </Link>
  );
}

function MoneyLine({ label, value, sign, href, hidden }) {
  if (hidden) return null;
  return (
    <li className={`flow-line flow-line-${sign === '+' ? 'in' : 'out'}`}>
      <span>{href ? <Link href={href}>{label}</Link> : label}</span>
      <strong>
        {sign} {money(value)}
      </strong>
    </li>
  );
}

function WebOrdersBanner({ counts }) {
  const toAttend = ['pendiente', 'pagado', 'preparando'].reduce((n, s) => n + (counts[s] || 0), 0);
  if (!toAttend) return null;
  return (
    <Link href="/admin/pedidos-web" className="web-orders-banner">
      <strong>
        {toAttend} pedido{toAttend === 1 ? '' : 's'} web por atender
      </strong>
      <span>
        {counts.pendiente || 0} por confirmar pago · {counts.pagado || 0} pagados ·{' '}
        {counts.preparando || 0} en preparación →
      </span>
    </Link>
  );
}

function PendingDeliveriesSection({ pendingDeliveries }) {
  if (pendingDeliveries.length === 0) return null;

  return (
    <div>
      <h2>Pendientes de entrega ({pendingDeliveries.length})</h2>
      <ul className="history-list">
        {pendingDeliveries.map((sale) => (
          <PendingDeliveryRow key={sale.id} sale={sale} />
        ))}
      </ul>
    </div>
  );
}

function PeriodSwitch({ period }) {
  return (
    <nav className="filter-chips period-switch" aria-label="Período">
      {Object.entries(PERIODS).map(([key, label]) => (
        <Link
          key={key}
          href={`/admin?periodo=${key}`}
          className={`filter-chip${period === key ? ' active' : ''}`}
          aria-current={period === key ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function PanderoProgress({ groups }) {
  if (groups.length === 0) return null;
  return (
    <div className="chart-card">
      <h3 className="chart-title">Pandero · número de esta semana</h3>
      <ul className="pandero-progress-list">
        {groups.map((group) => {
          const pct = group.size > 0 ? (group.paying / group.size) * 100 : 0;
          return (
            <li key={group.id}>
              <div className="pandero-progress-head">
                <strong>{group.name}</strong>
                <span>
                  Número {group.next_position} · le toca a {group.next_customer}
                </span>
              </div>
              <div
                className="pandero-progress-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={group.size}
                aria-valuenow={group.paying}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="pandero-progress-text">
                {group.paying} de {group.size} pagaron · {money(group.collected)} de {money(group.goal)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        Cada cuota que marcas como &quot;Pagando&quot; ya cuenta en &quot;Entró&quot;. Al entregar el
        perfume, la barra vuelve a cero para el siguiente número; la venta del perfume no se vuelve a
        sumar porque es el mismo dinero de las cuotas.
      </p>
    </div>
  );
}

export default async function ResumenPage({ searchParams }) {
  const role = await getCurrentRole();
  const { periodo } = await searchParams;
  const period = PERIODS[periodo] ? periodo : 'mes';

  let summary = null;
  let pendingDeliveries = [];
  const webCounts = await countWebOrdersByStatus();
  try {
    summary = await getSummary(role, period);
    pendingDeliveries = await listPendingDeliveries();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Resumen</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  if (role === 'vendedora') {
    return (
      <section className="admin-section">
        <h1>Resumen</h1>
        <WebOrdersBanner counts={webCounts} />
        <div className="stat-grid">
          <StatTile icon={<IconReceipt size={22} />} label="Tus ventas" value={summary.salesCount} />
          <StatTile icon={<IconCoin size={22} />} label="Total vendido" value={money(summary.salesTotal)} />
          <StatTile
            icon={<IconClock size={22} />}
            label="Comisión pendiente"
            tone="attention"
            value={money(summary.commissionPending)}
          />
          <StatTile
            icon={<IconWallet size={22} />}
            label="Comisión ya pagada"
            tone="good"
            value={money(summary.commissionPaidTotal)}
          />
        </div>

        <PendingDeliveriesSection pendingDeliveries={pendingDeliveries} />
      </section>
    );
  }

  const { flow } = summary;
  const periodLabel = PERIODS[period].toLowerCase();
  const reinvestPct =
    flow.incomeTotal > 0 ? (flow.purchasesReinvested / flow.incomeTotal) * 100 : null;

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Resumen</h1>
        <PeriodSwitch period={period} />
      </div>
      <WebOrdersBanner counts={webCounts} />

      <div className="kpi-grid">
        <KpiTile
          label="Entró"
          value={money(flow.incomeTotal)}
          sub="Dinero cobrado (no incluye lo que te deben)"
          tone="good"
        />
        <KpiTile
          label="Compra de perfumes"
          value={money(flow.purchases)}
          sub={`Reinvertido ${money(flow.purchasesReinvested)} · tu capital ${money(flow.purchasesCapital)}`}
        />
        <KpiTile
          label="Gastos extras"
          value={money(flow.expenses)}
          sub={`De ganancias ${money(flow.expensesFromEarnings)} · tu capital ${money(flow.expensesCapital)}`}
        />
        <KpiTile
          label="Ganancia de lo vendido"
          value={money(summary.salesProfit)}
          sub={`Ventas ${money(summary.salesTotal)} − costo ${money(summary.estimatedCost)} − comisiones ${money(summary.commissionsEarned)}`}
          tone={summary.salesProfit < 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Ganancias · {periodLabel}</h3>
          <ul className="profit-list flow-list">
            <MoneyLine
              label={`Ventas al contado (${flow.contadoCount})`}
              value={flow.contado}
              sign="+"
              href="/admin/ventas"
            />
            <MoneyLine label="Abonos de crédito" value={flow.creditPayments} sign="+" href="/admin/creditos" />
            <MoneyLine
              label={`Pandero · ${flow.panderoClosedCount} número${flow.panderoClosedCount === 1 ? '' : 's'} completado${flow.panderoClosedCount === 1 ? '' : 's'}`}
              value={flow.panderoClosed}
              sign="+"
              href="/admin/panderos"
            />
            <MoneyLine
              label="Pandero · cuotas de esta semana"
              value={flow.panderoThisWeek}
              sign="+"
              href="/admin/panderos"
              hidden={flow.panderoThisWeek === 0}
            />
            <li className="flow-subtotal">
              <span>Entró</span>
              <strong>{money(flow.incomeTotal)}</strong>
            </li>
            <MoneyLine
              label="Reinvertido en perfumes"
              value={flow.purchasesReinvested}
              sign="−"
              href="/admin/compras"
            />
            <MoneyLine
              label="Gastos pagados con ganancias"
              value={flow.expensesFromEarnings}
              sign="−"
              href="/admin/gastos"
              hidden={flow.expensesFromEarnings === 0}
            />
            <MoneyLine label="Comisiones pagadas" value={flow.commissionsPaid} sign="−" href="/admin/comisiones" />
            <MoneyLine
              label="Retiros para ti"
              value={flow.withdrawals}
              sign="−"
              href="/admin/caja"
              hidden={flow.withdrawals === 0}
            />
            <li className={`flow-total${flow.earningsLeft < 0 ? ' flow-total-negative' : ''}`}>
              <span>Te quedó de ganancias</span>
              <strong>{money(flow.earningsLeft)}</strong>
            </li>
          </ul>
          {reinvestPct != null && flow.purchasesReinvested > 0 ? (
            <p className="hint">
              Reinvertiste en perfumes el <strong>{reinvestPct.toFixed(0)}%</strong> de lo que entró.
            </p>
          ) : null}
          {flow.earningsLeft < 0 ? (
            <p className="hint">
              Salió más de lo que entró. Revisa si alguna compra o gasto marcado como
              &quot;Reinversión&quot; en realidad lo pagaste con tu capital.
            </p>
          ) : null}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Tu capital · {periodLabel}</h3>
          <ul className="profit-list flow-list flow-list-neutral">
            <MoneyLine label="En compra de perfumes" value={flow.purchasesCapital} sign="+" href="/admin/compras" />
            <MoneyLine label="En gastos extras" value={flow.expensesCapital} sign="+" href="/admin/gastos" />
            <MoneyLine
              label="Aportes en efectivo"
              value={flow.capitalIn}
              sign="+"
              href="/admin/caja"
              hidden={flow.capitalIn === 0}
            />
            <li className="flow-total flow-total-capital">
              <span>Total que pusiste de tu bolsillo</span>
              <strong>{money(flow.capitalPut)}</strong>
            </li>
          </ul>
          <p className="hint">
            Es dinero tuyo invertido en el negocio: no se resta de tus ganancias. Al registrar una compra
            o un gasto eliges si lo pagaste con tu capital o con las ganancias.
          </p>
        </div>

        <PanderoProgress groups={summary.panderoInProgress} />
      </div>

      <div>
        <h2 className="dashboard-heading">Pendientes</h2>
        <div className="attention-grid">
          <AttentionTile
            href="/admin/creditos"
            label="Te deben (crédito)"
            value={money(summary.creditPending)}
            hint="Cobrar"
            active={summary.creditPending > 0}
          />
          <AttentionTile
            href="/admin/comisiones"
            label="Comisión por pagar"
            value={money(summary.commissionPending)}
            hint="Pagar"
            active={summary.commissionPending > 0}
          />
          <AttentionTile
            href="/admin/ventas"
            label="Perfumes por entregar"
            value={summary.pendingDeliveriesCount}
            hint="Entregar"
            active={summary.pendingDeliveriesCount > 0}
          />
          <AttentionTile
            href="/admin/catalogo"
            label="Stock bajo (3 o menos)"
            value={summary.lowStockCount}
            hint="Reponer"
            active={summary.lowStockCount > 0}
          />
        </div>
      </div>

      <PendingDeliveriesSection pendingDeliveries={pendingDeliveries} />
    </section>
  );
}
