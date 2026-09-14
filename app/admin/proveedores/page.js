import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listSuppliers, listSupplierPrices, listPriceComparison } from '@/lib/db';
import SupplierFormModal from './SupplierFormModal';
import SupplierCard from './SupplierCard';
import PriceComparison from './PriceComparison';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let suppliers;
  let comparison;
  try {
    [perfumes, suppliers, comparison] = await Promise.all([
      listPerfumes(),
      listSuppliers(),
      listPriceComparison(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Proveedores</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const pricesBySupplier = await Promise.all(
    suppliers.map((supplier) => listSupplierPrices(supplier.id)),
  );

  return (
    <section className="admin-section">
      <h1>Proveedores</h1>
      <p className="hint">
        Registra qué te cobra cada proveedor por cada perfume (puedes pegar varias líneas de una
        vez) y abajo verás automáticamente cuál te conviene más comprar y dónde.
      </p>

      <div>
        <h2>Comparación de precios</h2>
        <PriceComparison comparison={comparison} />
      </div>

      <div className="admin-header">
        <h2>Mis proveedores ({suppliers.length})</h2>
        <SupplierFormModal />
      </div>

      {suppliers.length === 0 ? (
        <p>Todavía no has agregado ningún proveedor.</p>
      ) : (
        suppliers.map((supplier, index) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            perfumes={perfumes}
            prices={pricesBySupplier[index]}
          />
        ))
      )}
    </section>
  );
}
