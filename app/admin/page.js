import { getCurrentRole } from '@/lib/session';
import Link from 'next/link';
import { getSummary, listPendingDeliveries, PERIODS } from '@/lib/db';
import { countWebOrdersByStatus } from '@/lib/store-db';
import {
  IconBottle,
  IconLayers,
  IconReceipt,
  IconCoin,
  IconClock,
  IconWallet,
  IconTruck,
} from './icons';
import StockBarChart from './StockBarChart';
import PaymentSplitBar from './PaymentSplitBar';
import PendingDeliveryRow from './PendingDeliveryRow';

export const dynamic = 'force-dynamic';

const money = (value) => `S/ ${Number(value).toFixed(2)}`;

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

function AttentionTile({ href, label, value, hint, active }) {
  return (
    <Link href={href} className={`attention-tile${active ? ' attention-tile-active' : ''}`}>
      <span className="attention-tile-label">{label}</span>
      <strong className="attention-tile-value">{value}</strong>
      <span className="attention-tile-hint">{hint} →</span>
    </Link>
  );
}

function FlowLine({ label, value, sign, href }) {
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
  const reinvestPct = flow.purchases > 0 ? (flow.purchasesFromSales / flow.purchases) * 100 : 0;

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Resumen</h1>
        <PeriodSwitch period={period} />
      </div>
      <WebOrdersBanner counts={webCounts} />

      {/* 1. ¿Cuánto dinero tengo? */}
      <div className="money-hero">
        <div className="money-hero-main">
          <span className="money-hero-label">Dinero en caja hoy</span>
          <strong className={`money-hero-value${summary.cashOnHand < 0 ? ' text-critical' : ''}`}>
            {money(summary.cashOnHand)}
          </strong>
          <Link href="/admin/caja" className="money-hero-link">
            Registrar aporte o retiro →
          </Link>
        </div>
        <ul className="money-hero-stats">
          <li>
            <span>Entró ({periodLabel})</span>
            <strong className="text-good">+ {money(flow.capitalIn + flow.incomeTotal)}</strong>
          </li>
          <li>
            <span>Salió ({periodLabel})</span>
            <strong className="text-critical">− {money(flow.outTotal)}</strong>
          </li>
          <li>
            <span>Ganancia neta ({periodLabel})</span>
            <strong className={summary.netProfit < 0 ? 'text-critical' : 'text-good'}>
              {money(summary.netProfit)}
            </strong>
          </li>
        </ul>
      </div>
      {summary.cashOnHand < 0 ? (
        <p className="form-error">
          La caja sale negativa: probablemente falta registrar el capital que pusiste de tu bolsillo.{' '}
          <Link href="/admin/caja">Anótalo en Caja</Link>.
        </p>
      ) : null}

      {/* 2. ¿Qué tengo que atender? */}
      <div>
        <h2 className="dashboard-heading">Pendientes</h2>
        <div className="attention-grid">
          <AttentionTile
            href="/admin/creditos"
            label="Te deben (crédito / pandero)"
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
            label="Perfumes con stock bajo (≤ 3)"
            value={summary.lowStockCount}
            hint="Reponer"
            active={summary.lowStockCount > 0}
          />
        </div>
      </div>

      {/* 3. ¿Por dónde entró y salió el dinero? */}
      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Flujo de dinero · {periodLabel}</h3>
          <ul className="profit-list flow-list">
            <FlowLine label="Cobrado de ventas" value={flow.collectedSales} sign="+" href="/admin/ventas" />
            <FlowLine label="Cuotas de pandero" value={flow.panderoCuotas} sign="+" href="/admin/panderos" />
            <FlowLine label="Aportes de tu bolsillo" value={flow.capitalIn} sign="+" href="/admin/caja" />
            <FlowLine label="Compras de stock" value={flow.purchases} sign="−" href="/admin/compras" />
            <FlowLine label="Gastos extras" value={flow.expenses} sign="−" href="/admin/gastos" />
            <FlowLine label="Comisiones pagadas" value={flow.commissionsPaid} sign="−" href="/admin/comisiones" />
            <FlowLine label="Retiros para ti" value={flow.withdrawals} sign="−" href="/admin/caja" />
            <li className="profit-highlight">
              <span>Resultado del período</span>
              <strong className={flow.net < 0 ? 'text-critical' : undefined}>{money(flow.net)}</strong>
            </li>
          </ul>
          <p className="hint">
            &quot;Cobrado&quot; es dinero que realmente entró: ventas al contado y abonos de crédito.
            Lo que aún te deben no se cuenta hasta que lo cobres.
          </p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Reinversión · {periodLabel}</h3>
          {flow.purchases > 0 ? (
            <>
              <p className="reinvest-headline">
                Compraste stock por <strong>{money(flow.purchases)}</strong>
              </p>
              <div
                className="split-bar"
                role="img"
                aria-label={`${reinvestPct.toFixed(0)}% pagado con ventas, ${(100 - reinvestPct).toFixed(0)}% con tu capital`}
              >
                {flow.purchasesFromSales > 0 ? (
                  <span className="split-bar-segment split-bar-contado" style={{ width: `${reinvestPct}%` }} />
                ) : null}
                {flow.purchasesFromCapital > 0 ? (
                  <span
                    className="split-bar-segment split-bar-credito"
                    style={{ width: `${100 - reinvestPct}%` }}
                  />
                ) : null}
              </div>
              <ul className="split-bar-legend">
                <li>
                  <span className="legend-dot legend-dot-contado" />
                  Reinvertido de las ventas — {money(flow.purchasesFromSales)} ({reinvestPct.toFixed(0)}%)
                </li>
                <li>
                  <span className="legend-dot legend-dot-credito" />
                  Con tu capital (aportes) — {money(flow.purchasesFromCapital)} ({(100 - reinvestPct).toFixed(0)}%)
                </li>
              </ul>
              {flow.reinvestRatePct != null ? (
                <p className="hint">
                  De cada S/ 100 que entraron por ventas y cuotas, reinvertiste{' '}
                  <strong>S/ {Math.min(flow.reinvestRatePct, 999).toFixed(0)}</strong> en stock.
                </p>
              ) : null}
            </>
          ) : (
            <p className="hint">No registraste compras en este período.</p>
          )}
          <p className="hint">
            Se considera que las compras se pagan primero con lo que aportaste en el mismo período; el
            resto salió de lo que ganaste vendiendo.
          </p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Rentabilidad · {periodLabel}</h3>
          <ul className="profit-list">
            <li>
              <span>Vendido ({summary.salesCount} venta{summary.salesCount === 1 ? '' : 's'})</span>
              <strong>{money(summary.salesTotal)}</strong>
            </li>
            <li>
              <span>Costo de lo vendido</span>
              <strong>− {money(summary.estimatedCost)}</strong>
            </li>
            <li>
              <span>Ganancia bruta</span>
              <strong>{money(summary.grossProfit)}</strong>
            </li>
            <li>
              <span>Comisiones de la vendedora</span>
              <strong>− {money(summary.commissionsEarned)}</strong>
            </li>
            <li>
              <span>Gastos extras</span>
              <strong>− {money(summary.expensesTotal)}</strong>
            </li>
            <li className="profit-highlight">
              <span>Ganancia neta · margen {summary.profitMarginPct.toFixed(1)}%</span>
              <strong className={summary.netProfit < 0 ? 'text-critical' : undefined}>
                {money(summary.netProfit)}
              </strong>
            </li>
          </ul>
          <p className="hint">
            Cuenta las ventas del período aunque aún no estén cobradas. El costo usa el costo promedio de
            compra de cada perfume (con flete); si un perfume no tiene compras registradas, su costo
            cuenta como S/ 0.00.
          </p>
        </div>

        <PaymentSplitBar
          contadoCount={summary.contadoCount}
          creditoCount={summary.creditoCount}
          panderoCount={summary.panderoCount}
          contadoTotal={summary.contadoTotal}
          creditoTotal={summary.creditoTotal}
          panderoTotal={summary.panderoTotal}
        />
      </div>

      {/* 4. ¿Cómo está mi inventario? */}
      <div>
        <h2 className="dashboard-heading">Inventario</h2>
        <div className="stat-grid">
          <StatTile icon={<IconBottle size={22} />} label="Perfumes en catálogo" value={summary.perfumesCount} />
          <StatTile icon={<IconLayers size={22} />} label="Unidades en stock" value={summary.stockTotal} />
          <StatTile
            icon={<IconTruck size={22} />}
            label="Valor del stock (a costo)"
            value={money(summary.potentialCost)}
          />
          <StatTile
            icon={<IconCoin size={22} />}
            label="Si vendes todo el stock (ingreso)"
            value={money(summary.potentialRevenue)}
          />
          <StatTile
            icon={<IconWallet size={22} />}
            label="Ganancia proyectada del stock"
            tone="good"
            value={money(summary.potentialProfit)}
          />
        </div>
      </div>
      <div className="chart-grid">
        <StockBarChart perfumes={summary.stockByPerfume} />
      </div>

      <PendingDeliveriesSection pendingDeliveries={pendingDeliveries} />
    </section>
  );
}
