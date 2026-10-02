import { getCurrentRole } from '@/lib/session';
import Link from 'next/link';
import { getCashFlow, getSummary, listPendingDeliveries, PERIODS } from '@/lib/db';
import { countWebOrdersByStatus } from '@/lib/store-db';
import { getBusinessPlan } from '@/lib/reports';
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

/** Acceso al Plan: cuándo recuperas tu inversión y cuántas cosas hay por hacer. */
function PlanBanner({ plan }) {
  if (!plan) return null;
  const p = plan.perfumes;
  // Reinvirtiendo todo, lo útil es ver cuánto ya rotó la inversión y cuánto vale el negocio.
  const headline =
    p.invested > 0
      ? `Tu negocio vale ${money(p.businessValue)} · ya vendiste el ${p.turnedPercent}% de lo que pusiste en perfumes`
      : `Tu negocio vale ${money(p.businessValue)}`;
  const pending = plan.actions.length;
  return (
    <Link href="/admin/plan" className="web-orders-banner plan-banner">
      <strong>{headline}</strong>
      <span>
        {pending ? `${pending} cosa${pending === 1 ? '' : 's'} por hacer` : 'Todo en orden'}
        {plan.buyList.some((b) => b.fits) ? ' · hay perfumes para reponer' : ''} · ver tu plan →
      </span>
    </Link>
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
  let cashTotal = 0;
  let plan = null;
  const webCounts = await countWebOrdersByStatus();
  try {
    summary = await getSummary(role, period);
    pendingDeliveries = await listPendingDeliveries();
    // Dinero en caja hoy (desde el inicio), solo para el admin.
    if (role === 'admin') {
      cashTotal = (await getCashFlow()).net;
      // Resumen del plan (recuperación de la inversión y acciones pendientes).
      plan = await getBusinessPlan().catch(() => null);
    }
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
  // Una sola caja: todo lo que salió, sin importar con qué dinero se pagó.
  const outflow =
    flow.purchases + flow.expenses + flow.commissionsPaid + flow.withdrawals + flow.debtPayments + flow.pfOutflows;
  const difference = flow.incomeTotal + flow.capitalPut - outflow;

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Resumen</h1>
        <PeriodSwitch period={period} />
      </div>
      <WebOrdersBanner counts={webCounts} />
      <PlanBanner plan={plan} />

      <div className="kpi-grid">
        <KpiTile
          label="Tienes en caja"
          value={money(cashTotal)}
          sub="Hoy, sumando todo desde el inicio"
          tone={cashTotal < 0 ? 'bad' : 'good'}
        />
        <KpiTile label="Entró por ventas" value={money(flow.incomeTotal)} sub={`Cobrado ${periodLabel}`} tone="good" />
        <KpiTile label="Salió" value={money(outflow)} sub={`Todo lo pagado ${periodLabel}`} />
        <KpiTile
          label="Ganancia de las ventas"
          value={money(summary.profit)}
          sub={`Ventas ${money(summary.salesTotal)} − costo ${money(summary.estimatedCost)} − comisiones ${money(summary.commissionsEarned)}${
            summary.lossesTotal > 0
              ? ` − pérdidas ${money(summary.lossesTotal)} (${summary.lossesCount})`
              : ''
          }`}
          tone={summary.profit < 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h3 className="chart-title">Caja · {periodLabel}</h3>
          <ul className="profit-list flow-list">
            <MoneyLine
              label={`Ventas al contado (${flow.contadoCount})`}
              value={flow.contado}
              sign="+"
              href="/admin/ventas"
            />
            <MoneyLine label="Abonos de crédito" value={flow.creditPayments} sign="+" href="/admin/creditos" />
            <MoneyLine
              label="Cuotas de pandero"
              value={flow.panderoClosed + flow.panderoThisWeek}
              sign="+"
              href="/admin/panderos"
              hidden={flow.panderoClosed + flow.panderoThisWeek === 0}
            />
            <MoneyLine
              label="Pusiste tú"
              value={flow.capitalPut}
              sign="+"
              href="/admin/caja"
              hidden={flow.capitalPut === 0}
            />
            <MoneyLine label="Compra de perfumes" value={flow.purchases} sign="−" href="/admin/compras" hidden={flow.purchases === 0} />
            <MoneyLine label="Gastos del negocio" value={flow.expenses} sign="−" href="/admin/gastos" hidden={flow.expenses === 0} />
            <MoneyLine
              label="Pago a la vendedora"
              value={flow.commissionsPaid}
              sign="−"
              href="/admin/comisiones"
              hidden={flow.commissionsPaid === 0}
            />
            <MoneyLine label="Saqué para mí" value={flow.withdrawals} sign="−" href="/admin/caja" hidden={flow.withdrawals === 0} />
            <MoneyLine label="Pago de deudas" value={flow.debtPayments} sign="−" href="/admin/deudas" hidden={flow.debtPayments === 0} />
            <MoneyLine
              label="Impuestos, reserva y otras salidas"
              value={flow.pfOutflows}
              sign="−"
              href="/admin/caja"
              hidden={flow.pfOutflows === 0}
            />
            <li className={`flow-total${difference < 0 ? ' flow-total-negative' : ''}`}>
              <span>Diferencia {periodLabel}</span>
              <strong>{money(difference)}</strong>
            </li>
          </ul>
          <Link href="/admin/caja" className="chart-footnote">
            Registrar una salida o dinero que pusiste →
          </Link>
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
