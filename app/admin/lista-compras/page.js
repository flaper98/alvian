import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listPurchaseCosts, listShoppingList, listSupplierPriceMap, listSuppliers } from '@/lib/db';
import ShoppingList from './ShoppingList';

export const dynamic = 'force-dynamic';

export default async function ListaComprasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let items;
  let perfumes;
  let suppliers;
  let supplierPrices;
  let costs;
  try {
    [items, perfumes, suppliers, supplierPrices, costs] = await Promise.all([
      listShoppingList(),
      listPerfumes(),
      listSuppliers(),
      listSupplierPriceMap(),
      listPurchaseCosts(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Lista de compras</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Lo mínimo que necesita el navegador: nombre, stock y precios de cada perfume.
  const catalog = perfumes.map((p) => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    salePrice: p.price == null ? null : Number(p.price),
    lastCost: costs[p.id]?.lastCost ?? costs[p.id]?.supplier?.price ?? null,
  }));

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Lista de compras</h1>
      </div>
      <p className="hint">
        Anota lo que piensas comprar, a quién y a cuánto. No cambia tu stock ni tu caja hasta que tocas «Ya lo compré».
      </p>
      <ShoppingList
        items={items}
        catalog={catalog}
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        supplierPrices={supplierPrices}
      />
    </section>
  );
}
