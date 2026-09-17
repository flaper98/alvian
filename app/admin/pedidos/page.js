import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listOrders, listOrderShortfalls } from '@/lib/db';
import OrderFormModal from './OrderFormModal';
import OrdersList from './OrdersList';

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let orders;
  let shortfalls;
  try {
    [perfumes, orders, shortfalls] = await Promise.all([
      listPerfumes(),
      listOrders(),
      listOrderShortfalls(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Pedidos</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Pedidos</h1>
        <OrderFormModal perfumes={perfumes} />
      </div>

      <div>
        <h2>Qué te falta comprar ({shortfalls.length})</h2>
        {shortfalls.length === 0 ? (
          <p>No hay pedidos pendientes que superen tu stock actual.</p>
        ) : (
          <ul className="history-list">
            {shortfalls.map((row) => (
              <li key={row.perfume_id} className="history-row">
                <div>
                  <strong>{row.perfume_name}</strong>
                  <p>
                    Pedido: {row.ordered_quantity} unid. · Stock actual: {row.perfume_stock} unid.
                  </p>
                  {row.best_supplier_name ? (
                    <p className="hint">
                      Más barato en <strong>{row.best_supplier_name}</strong> ({row.best_tier_label}): S/{' '}
                      {Number(row.best_price).toFixed(2)}
                    </p>
                  ) : (
                    <p className="hint">Todavía no tienes precios de proveedores para este perfume.</p>
                  )}
                </div>
                <span className="badge badge-pending">Faltan {row.shortfall} unid.</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2>Pedidos registrados ({orders.length})</h2>
        <OrdersList orders={orders} />
      </div>
    </section>
  );
}
