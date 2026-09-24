import { getCurrentRole } from '@/lib/session';
import { listSalesBySeller, getCommissionPercent } from '@/lib/db';
import CommissionsList from './CommissionsList';
import CommissionPercentForm from './CommissionPercentForm';
import {
  IconWallet,
  IconClock,
  IconCheck,
} from '../icons';

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

export default async function ComisionesPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let sales;
  let percent;
  try {
    sales = await listSalesBySeller('vendedora');
    percent = await getCommissionPercent();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Comisiones</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const unpaid = sales.filter((sale) => !sale.commission_paid);
  const readyTotal = unpaid.reduce((sum, sale) => sum + Number(sale.commissionPayoutDue || 0), 0);
  const waitingTotal = unpaid.reduce(
    (sum, sale) => sum + Math.max(Number(sale.commission_amount || 0) - Number(sale.commissionAvailable || 0), 0),
    0
  );
  const paidTotal = sales
    .filter((sale) => sale.commission_paid)
    .reduce((sum, sale) => sum + Number(sale.commission_paid_amount || sale.commission_amount || 0), 0);

  return (
    <section className="admin-section">
      <h1>Comisiones</h1>

      {role === 'admin' ? <CommissionPercentForm percent={percent} /> : null}

      <p>
        Comisión actual: <strong>{Number(percent).toFixed(1)}%</strong> por venta.
      </p>

      <div className="stat-grid">
        <StatTile
          icon={<IconWallet size={22} />}
          label="Lista para pagar (fin de mes)"
          tone="attention"
          value={`S/ ${readyTotal.toFixed(2)}`}
        />
        {waitingTotal > 0 ? (
          <StatTile
            icon={<IconClock size={22} />}
            label="Depende de que el cliente termine de pagar"
            value={`S/ ${waitingTotal.toFixed(2)}`}
          />
        ) : null}
        <StatTile
          icon={<IconCheck size={22} />}
          label="Ya pagada"
          tone="good"
          value={`S/ ${paidTotal.toFixed(2)}`}
        />
      </div>

      <CommissionsList sales={sales} canEdit={role === 'admin'} />
    </section>
  );
}
