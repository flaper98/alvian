import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listSales } from '@/lib/db';
import SaleFormModal from './SaleFormModal';
import SaleRow from './SaleRow';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let sales;
  try {
    [perfumes, sales] = await Promise.all([listPerfumes(), listSales()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Ventas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Ventas</h1>
        <SaleFormModal perfumes={perfumes} />
      </div>

      <div>
        <h2>Historial de ventas ({sales.length})</h2>
        {sales.length === 0 ? (
          <p>Todavía no hay ventas registradas.</p>
        ) : (
          <ul className="history-list">
            {sales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} canManage={role === 'admin'} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
