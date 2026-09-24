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

  const supplierTotalsMap = new Map();
  let unassignedCount = 0;
  for (const row of shortfalls) {
    if (row.best_supplier_name && row.best_price != null) {
      const subtotal = row.shortfall * Number(row.best_price);
      const current = supplierTotalsMap.get(row.best_supplier_name) || {
        supplierName: row.best_supplier_name,
        itemsCount: 0,
        total: 0,
      };
      current.itemsCount += 1;
      current.total += subtotal;
      supplierTotalsMap.set(row.best_supplier_name, current);
    } else {
      unassignedCount += 1;
    }
  }
  const supplierTotals = Array.from(supplierTotalsMap.values()).sort((a, b) => b.total - a.total);
  const grandTotal = supplierTotals.reduce((sum, s) => sum + s.total, 0);

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
          <>
            <div className="perfume-table-wrap">
              <table className="perfume-table table-cards">
                <thead>
                  <tr>
                    <th scope="col">Perfume</th>
                    <th scope="col">Pedido</th>
                    <th scope="col">Stock actual</th>
                    <th scope="col">Faltan</th>
                    <th scope="col">Proveedor más barato</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {shortfalls.map((row) => {
                    const subtotal =
                      row.best_price != null ? row.shortfall * Number(row.best_price) : null;
                    return (
                      <tr key={row.perfume_id} className="perfume-table-row">
                        <td className="table-cards-title">
                          <strong>{row.perfume_name}</strong>
                        </td>
                        <td className="perfume-table-stock-cell" data-label="Pedido">
                          {row.ordered_quantity}
                        </td>
                        <td className="perfume-table-stock-cell" data-label="Stock actual">
                          {row.perfume_stock}
                        </td>
                        <td className="perfume-table-stock-cell text-critical" data-label="Faltan">
                          {row.shortfall}
                        </td>
                        <td className="table-cards-full" data-label="Proveedor más barato">
                          {row.best_supplier_name ? (
                            <>
                              {row.best_supplier_name}{' '}
                              <span className="badge badge-contado">{row.best_tier_label}</span>
                            </>
                          ) : (
                            <span className="badge badge-pending">Sin proveedor</span>
                          )}
                        </td>
                        <td className="perfume-table-price-cell" data-label="Precio">
                          {row.best_price != null ? `S/ ${Number(row.best_price).toFixed(2)}` : '—'}
                        </td>
                        <td className="perfume-table-price-cell" data-label="Subtotal">
                          {subtotal != null ? `S/ ${subtotal.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Gasto estimado por proveedor</h3>
              <ul className="profit-list">
                {supplierTotals.map((s) => (
                  <li key={s.supplierName}>
                    <span>
                      {s.supplierName} ({s.itemsCount} perfume{s.itemsCount === 1 ? '' : 's'})
                    </span>
                    <strong>S/ {s.total.toFixed(2)}</strong>
                  </li>
                ))}
                {unassignedCount > 0 ? (
                  <li>
                    <span>
                      Sin proveedor cargado ({unassignedCount} perfume{unassignedCount === 1 ? '' : 's'})
                    </span>
                    <strong>—</strong>
                  </li>
                ) : null}
                <li className="profit-highlight">
                  <span>Total estimado (comprando siempre al más barato)</span>
                  <strong>S/ {grandTotal.toFixed(2)}</strong>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div>
        <h2>Pedidos registrados ({orders.length})</h2>
        <OrdersList orders={orders} perfumes={perfumes} canReceive={role === 'admin'} />
      </div>
    </section>
  );
}
