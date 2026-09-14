import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listSales, listUsers } from '@/lib/db';
import SaleFormModal from './SaleFormModal';
import SalesList from './SalesList';

export const dynamic = 'force-dynamic';

export default async function VentasPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let sales;
  let users = [];
  try {
    [perfumes, sales] = await Promise.all([listPerfumes(), listSales()]);
    if (role === 'admin') {
      users = await listUsers();
    }
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Ventas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }
  const activeUsers = users.filter((user) => user.active);

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Ventas</h1>
        <SaleFormModal perfumes={perfumes} />
      </div>

      <div>
        <h2>Historial de ventas ({sales.length})</h2>
        <SalesList sales={sales} canManage={role === 'admin'} users={activeUsers} />
      </div>
    </section>
  );
}
