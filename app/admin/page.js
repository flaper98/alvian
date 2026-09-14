import { getCurrentRole } from '@/lib/session';
import { getSummary, listPendingDeliveries } from '@/lib/db';
import { IconBottle, IconLayers, IconReceipt, IconCoin, IconClock, IconWallet } from './icons';
import StockBarChart from './StockBarChart';
import PaymentSplitBar from './PaymentSplitBar';
import PendingDeliveryRow from './PendingDeliveryRow';

export const dynamic = 'force-dynamic';

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

export default async function ResumenPage() {
  const role = await getCurrentRole();

  let summary = null;
  let pendingDeliveries = [];
  try {
    summary = await getSummary(role);
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
        <div className="stat-grid">
          <StatTile icon={<IconReceipt size={22} />} label="Tus ventas" value={summary.salesCount} />
          <StatTile
            icon={<IconCoin size={22} />}
            label="Total vendido"
            value={`S/ ${Number(summary.salesTotal).toFixed(2)}`}
          />
          <StatTile
            icon={<IconClock size={22} />}
            label="Comisión pendiente"
            tone="attention"
            value={`S/ ${Number(summary.commissionPending).toFixed(2)}`}
          />
          <StatTile
            icon={<IconWallet size={22} />}
            label="Comisión ya pagada"
            tone="good"
            value={`S/ ${Number(summary.commissionPaidTotal).toFixed(2)}`}
          />
        </div>

        <PendingDeliveriesSection pendingDeliveries={pendingDeliveries} />
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Resumen</h1>
      <div className="stat-grid">
        <StatTile icon={<IconBottle size={22} />} label="Perfumes en catálogo" value={summary.perfumesCount} />
        <StatTile icon={<IconLayers size={22} />} label="Stock total" value={summary.stockTotal} />
        <StatTile icon={<IconReceipt size={22} />} label="Ventas registradas" value={summary.salesCount} />
        <StatTile
          icon={<IconCoin size={22} />}
          label="Total vendido"
          value={`S/ ${Number(summary.salesTotal).toFixed(2)}`}
        />
        <StatTile
          icon={<IconClock size={22} />}
          label="Crédito pendiente de cobro"
          tone="attention"
          value={`S/ ${Number(summary.creditPending).toFixed(2)}`}
        />
        <StatTile
          icon={<IconWallet size={22} />}
          label="Comisión pendiente de pago"
          tone="attention"
          value={`S/ ${Number(summary.commissionPending).toFixed(2)}`}
        />
        <StatTile
          icon={<IconClock size={22} />}
          label="Perfumes pendientes de entrega"
          tone="attention"
          value={summary.pendingDeliveriesCount}
        />
        <StatTile
          icon={<IconWallet size={22} />}
          label="Cobrado (recibido en efectivo/abonos)"
          tone="good"
          value={`S/ ${Number(summary.collectedTotal).toFixed(2)}`}
        />
        <StatTile
          icon={<IconCoin size={22} />}
          label="Invertido en compras (histórico)"
          value={`S/ ${Number(summary.totalInvested).toFixed(2)}`}
        />
      </div>

      <div className="chart-grid">
        <StockBarChart perfumes={summary.stockByPerfume} />
        <PaymentSplitBar
          contadoCount={summary.contadoCount}
          creditoCount={summary.creditoCount}
          panderoCount={summary.panderoCount}
          contadoTotal={summary.contadoTotal}
          creditoTotal={summary.creditoTotal}
          panderoTotal={summary.panderoTotal}
        />
        <div className="chart-card">
          <h3 className="chart-title">Rentabilidad</h3>
          <ul className="profit-list">
            <li>
              <span>Total vendido</span>
              <strong>S/ {Number(summary.salesTotal).toFixed(2)}</strong>
            </li>
            <li>
              <span>Costo estimado</span>
              <strong>S/ {Number(summary.estimatedCost).toFixed(2)}</strong>
            </li>
            <li className="profit-highlight">
              <span>Ganancia bruta</span>
              <strong>S/ {Number(summary.grossProfit).toFixed(2)}</strong>
            </li>
            <li>
              <span>Margen</span>
              <strong>{Number(summary.profitMarginPct).toFixed(1)}%</strong>
            </li>
          </ul>
          <p className="hint">
            El costo se calcula con el costo promedio de compra de cada perfume (incluye flete). Si
            un perfume se vendió sin tener ninguna compra registrada, su costo cuenta como S/ 0.00
            y la ganancia se ve inflada hasta que registres esa compra.
          </p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Si vendes todo tu stock actual</h3>
          <ul className="profit-list">
            <li>
              <span>Ingreso proyectado</span>
              <strong>S/ {Number(summary.potentialRevenue).toFixed(2)}</strong>
            </li>
            <li>
              <span>Costo de ese stock</span>
              <strong>S/ {Number(summary.potentialCost).toFixed(2)}</strong>
            </li>
            <li className="profit-highlight">
              <span>Ganancia proyectada</span>
              <strong>S/ {Number(summary.potentialProfit).toFixed(2)}</strong>
            </li>
          </ul>
          <p className="hint">
            Es una proyección: cuánto ganarías si en este momento vendieras todo el stock que tienes
            en mano, al precio de venta actual de cada perfume.
          </p>
        </div>
      </div>

      <PendingDeliveriesSection pendingDeliveries={pendingDeliveries} />
    </section>
  );
}
