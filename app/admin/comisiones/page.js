import { getCurrentRole } from '@/lib/session';
import { listSalesBySeller, getCommissionPercent } from '@/lib/db';
import CommissionsList from './CommissionsList';
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

  function isFullyCollected(sale) {
    return sale.payment_type === 'contado' || Number(sale.balance) <= 0;
  }

  const unpaid = sales.filter((sale) => !sale.commission_paid);
  const readyTotal = unpaid
    .filter(isFullyCollected)
    .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);
  const waitingTotal = unpaid
    .filter((sale) => !isFullyCollected(sale))
    .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);
  const paidTotal = sales
    .filter((sale) => sale.commission_paid)
    .reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);

  return (
    <section className="admin-section">
      <h1>Comisiones</h1>

      {role === 'admin' ? <CommissionPercentForm percent={percent} /> : null}

      <p>
        Comisión actual: <strong>{Number(percent).toFixed(1)}%</strong> por venta.
      </p>
      <p>
        Lista para pagar (fin de mes): <strong>S/ {readyTotal.toFixed(2)}</strong>
        {waitingTotal > 0 ? (
          <>
            {' '}
            · Depende de que el cliente termine de pagar:{' '}
            <strong>S/ {waitingTotal.toFixed(2)}</strong>
          </>
        ) : null}{' '}
        · Ya pagada: <strong>S/ {paidTotal.toFixed(2)}</strong>
      </p>

      <CommissionsList sales={sales} canEdit={role === 'admin'} />
    </section>
  );
}
