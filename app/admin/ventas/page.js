import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listSales } from '@/lib/db';
import SaleForm from './SaleForm';

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
      <h1>Ventas</h1>
      <SaleForm perfumes={perfumes} />

      <div>
        <h2>Historial de ventas ({sales.length})</h2>
        {sales.length === 0 ? (
          <p>Todavía no hay ventas registradas.</p>
        ) : (
          <ul className="history-list">
            {sales.map((sale) => (
              <li key={sale.id} className="history-row">
                <div>
                  <strong>{sale.perfume_name}</strong>
                  <span>
                    {' '}
                    · {sale.quantity} unid. · S/ {Number(sale.total).toFixed(2)}
                  </span>{' '}
                  <span className={`badge badge-${sale.payment_type}`}>
                    {sale.payment_type === 'credito' ? 'Crédito' : 'Contado'}
                  </span>
                  {sale.customer_name ? <p>Cliente: {sale.customer_name}</p> : null}
                  <p className="hint">
                    Vendido por: {sale.sold_by_role === 'admin' ? 'Admin' : 'Vendedora'}
                  </p>
                </div>
                <time>{new Date(sale.created_at).toLocaleDateString('es-PE')}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
