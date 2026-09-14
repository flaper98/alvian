import { getCurrentRole } from '@/lib/session';
import { listSalesBySeller, getCommissionPercent } from '@/lib/db';
import CommissionRow from './CommissionRow';
import CommissionPercentForm from './CommissionPercentForm';

export const dynamic = 'force-dynamic';

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

  const pendingTotal = sales
    .filter((sale) => !sale.commission_paid)
    .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);
  const paidTotal = sales
    .filter((sale) => sale.commission_paid)
    .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);

  return (
    <section className="admin-section">
      <h1>Comisiones</h1>

      {role === 'admin' ? <CommissionPercentForm percent={percent} /> : null}

      <p>
        Comisión actual: <strong>{Number(percent).toFixed(1)}%</strong> por venta · Pendiente de
        pago: <strong>S/ {pendingTotal.toFixed(2)}</strong> · Ya pagada:{' '}
        <strong>S/ {paidTotal.toFixed(2)}</strong>
      </p>

      {sales.length === 0 ? (
        <p>Todavía no hay ventas de la vendedora.</p>
      ) : (
        <ul className="history-list">
          {sales.map((sale) => (
            <CommissionRow key={sale.id} sale={sale} canEdit={role === 'admin'} />
          ))}
        </ul>
      )}
    </section>
  );
}
