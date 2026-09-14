import { getCurrentRole } from '@/lib/session';
import { getSummary } from '@/lib/db';
import { IconBottle, IconLayers, IconReceipt, IconCoin, IconClock, IconWallet } from './icons';
import StockBarChart from './StockBarChart';
import PaymentSplitBar from './PaymentSplitBar';

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

export default async function ResumenPage() {
  const role = await getCurrentRole();

  let summary = null;
  try {
    summary = await getSummary(role);
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
      </div>

      <div className="chart-grid">
        <StockBarChart perfumes={summary.stockByPerfume} />
        <PaymentSplitBar
          contadoCount={summary.contadoCount}
          creditoCount={summary.creditoCount}
          contadoTotal={summary.contadoTotal}
          creditoTotal={summary.creditoTotal}
        />
      </div>
    </section>
  );
}
