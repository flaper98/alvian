import { getCurrentRole } from '@/lib/session';
import Link from 'next/link';
import { listStockLosses, listPerfumes, listPurchases } from '@/lib/db';
import LossFormModal from './LossFormModal';
import LossesList from './LossesList';

export const dynamic = 'force-dynamic';

export default async function PerdidasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let losses;
  let perfumes;
  let lostPurchases = [];
  try {
    let purchases;
    [losses, perfumes, purchases] = await Promise.all([listStockLosses(), listPerfumes(), listPurchases()]);
    // Compras pagadas que nunca llegaron (estafa): también son pérdida.
    lostPurchases = purchases.filter((p) => p.not_received);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Pérdidas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const total = losses.reduce((sum, loss) => sum + Number(loss.total_cost), 0);
  const units = losses.reduce((sum, loss) => sum + Number(loss.quantity), 0);
  const sortedPerfumes = [...perfumes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Pérdidas de producto</h1>
        <LossFormModal perfumes={sortedPerfumes} />
      </div>
      <p className="hint">
        Perfumes que se rompieron, se perdieron, vencieron o regalaste. Se descuentan del stock y
        restan de la ganancia en el Resumen.
      </p>
      {losses.length > 0 ? (
        <p>
          Total perdido: <strong className="text-critical">S/ {total.toFixed(2)}</strong> ({units}{' '}
          unidad{units === 1 ? '' : 'es'})
        </p>
      ) : null}
      <LossesList losses={losses} />
      {lostPurchases.length > 0 ? (
        <div>
          <h2>Compras que no llegaron</h2>
          <p className="hint">
            Pagadas y nunca recibidas (estafa o pedido perdido). También restan de la ganancia en el Resumen. Se
            marcan o desmarcan en <Link href="/admin/compras">Compras → Historial</Link> con «No llegó».
          </p>
          <p>
            Total:{" "}
            <strong className="text-critical">
              S/ {lostPurchases.reduce((sum, p) => sum + Number(p.total_cost), 0).toFixed(2)}
            </strong>{" "}
            ({lostPurchases.length} compra{lostPurchases.length === 1 ? "" : "s"})
          </p>
          <ul className="history-list">
            {lostPurchases.map((p) => (
              <li key={p.id}>
                <strong>{p.perfume_name}</strong> × {p.quantity} · S/ {Number(p.total_cost).toFixed(2)} ·{" "}
                {new Date(p.created_at).toLocaleDateString("es-PE")}
                {p.note ? ` · ${p.note}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
