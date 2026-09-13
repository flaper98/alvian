import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listPurchases } from '@/lib/db';
import PurchaseForm from './PurchaseForm';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const [perfumes, purchases] = await Promise.all([listPerfumes(), listPurchases()]);

  return (
    <section className="admin-section">
      <h1>Compras</h1>
      <PurchaseForm perfumes={perfumes} />

      <div>
        <h2>Historial de compras ({purchases.length})</h2>
        {purchases.length === 0 ? (
          <p>Todavía no hay compras registradas.</p>
        ) : (
          <ul className="history-list">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="history-row">
                <div>
                  <strong>{purchase.perfume_name}</strong>
                  <span>
                    {' '}
                    · {purchase.quantity} unid. · S/ {Number(purchase.unit_cost).toFixed(2)} c/u
                  </span>
                  {purchase.note ? <p>{purchase.note}</p> : null}
                </div>
                <time>{new Date(purchase.created_at).toLocaleDateString('es-PE')}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
