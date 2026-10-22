import { getCurrentRole } from '@/lib/session';
import {
  getPricingPlan,
  listPerfumes,
  listPurchaseCosts,
  listPurchases,
  listSupplierPriceMap,
  listSuppliers,
} from '@/lib/db';
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
  let pricing = null;
  let costs = {};
  let suppliers = [];
  let supplierPrices = {};
  try {
    let plan;
    [perfumes, purchases, plan, costs, suppliers, supplierPrices] = await Promise.all([
      listPerfumes(),
      listPurchases(),
      getPricingPlan(),
      listPurchaseCosts(),
      listSuppliers(),
      listSupplierPriceMap(),
    ]);
    // Para mostrar en el formulario a cuánto quedará el precio con tu regla automática.
    pricing = {
      config: plan.config,
      rates: plan.rates,
      perfumes: Object.fromEntries(
        plan.items.map((p) => [p.id, { avgCost: p.avgCost, units: p.purchasedUnits, price: p.price, locked: p.locked }]),
      ),
    };
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
        <PurchaseFormModal perfumes={perfumes} prefill={prefill} pricing={pricing} costs={costs}
          suppliers={suppliers.map((x) => ({ id: x.id, name: x.name }))}
          supplierPrices={supplierPrices}
        />
      </div>

      <div>
        <h2>Historial de compras ({purchases.length})</h2>
        <PurchaseHistoryList purchases={purchases} suppliers={suppliers.map((x) => ({ id: x.id, name: x.name }))} />
      </div>
    </section>
  );
}
