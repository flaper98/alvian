import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listPurchases } from '@/lib/db';
import PurchaseFormModal from './PurchaseFormModal';
import PurchaseHistoryList from './PurchaseHistoryList';

export const dynamic = 'force-dynamic';

export default async function ComprasPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const prefill = {
    perfumeId: params?.perfumeId || '',
    unitCost: params?.unitCost || '',
    note: params?.note || '',
  };

  let perfumes;
  let purchases;
  try {
    [perfumes, purchases] = await Promise.all([listPerfumes(), listPurchases()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Compras</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Compras</h1>
        <PurchaseFormModal perfumes={perfumes} prefill={prefill} />
      </div>

      <div>
        <h2>Historial de compras ({purchases.length})</h2>
        <PurchaseHistoryList purchases={purchases} />
      </div>
    </section>
  );
}
