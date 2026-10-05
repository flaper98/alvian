import { getCurrentRole } from '@/lib/session';
import { listCustomerNames, listDecantCatalog, listPerfumes, listSales, listUsers } from '@/lib/db';
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
  let customers = [];
  let decants = {};
  try {
    let catalog;
    [perfumes, sales, customers, catalog] = await Promise.all([
      listPerfumes(),
      listSales(),
      listCustomerNames(),
      listDecantCatalog().catch(() => null),
    ]);
    // Decants que se pueden vender: los que tienen ml abiertos o están en la tienda, con su precio.
    for (const item of catalog?.items || []) {
      const sizes = item.sizes.filter((s) => s.price != null).map((s) => ({ ml: s.ml, price: s.price }));
      if (sizes.length && (item.poolMl > 0 || item.enabled)) decants[item.id] = { poolMl: item.poolMl, sizes };
    }
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
        <SaleFormModal perfumes={perfumes} customers={customers} decants={decants} />
      </div>

      <div>
        <h2>Historial de ventas ({sales.length})</h2>
        <SalesList sales={sales} canManage={role === 'admin'} users={activeUsers} />
      </div>
    </section>
  );
}
