import { getCurrentRole } from '@/lib/session';
import { listSalesBySeller } from '@/lib/db';
import CommissionRow from './CommissionRow';

export const dynamic = 'force-dynamic';

export default async function ComisionesPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let sales;
  try {
    sales = await listSalesBySeller('vendedora');
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Comisiones</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Comisiones</h1>
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
