import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import {
  listPerfumes,
  listSupplierSummaries,
  listSupplierPrices,
  listPriceComparison,
  relinkSupplierPrices,
} from '@/lib/db';
import SupplierFormModal from './SupplierFormModal';
import SupplierDetail from './SupplierDetail';
import PriceComparison from './PriceComparison';

export const dynamic = 'force-dynamic';

const VIEWS = [
  ['comparar', 'Comparar precios'],
  ['proveedores', 'Mis proveedores'],
];

export default async function ProveedoresPage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const view = params.vista === 'proveedores' ? 'proveedores' : 'comparar';

  let suppliers;
  let comparison = [];
  let perfumes = [];
  let prices = [];
  let selected = null;
  try {
    // Arregla precios que quedaron "Sin catálogo" porque se cargaron antes de
    // crear el perfume. Es barato: solo revisa los que siguen sin vincular.
    await relinkSupplierPrices();
    suppliers = await listSupplierSummaries();
    if (view === 'comparar') {
      [comparison, perfumes] = await Promise.all([listPriceComparison(), listPerfumes()]);
    } else {
      selected = suppliers.find((s) => s.id === Number(params.p)) || suppliers[0] || null;
      if (selected) {
        [perfumes, prices] = await Promise.all([listPerfumes(), listSupplierPrices(selected.id)]);
      }
    }
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Proveedores</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Proveedores</h1>
        <SupplierFormModal />
      </div>

      <nav className="status-tabs" aria-label="Vista">
        {VIEWS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/proveedores?vista=${key}`}
            className={`status-tab${view === key ? ' active' : ''}`}
            aria-current={view === key ? 'page' : undefined}
          >
            {label}
            {key === 'proveedores' ? <span>{suppliers.length}</span> : null}
          </Link>
        ))}
      </nav>

      {view === 'comparar' ? (
        <>
          <p className="hint">
            Compara lo que te cobra cada proveedor. En verde, dónde te conviene comprar.
          </p>
          <PriceComparison
            comparison={comparison}
            catalogPrices={Object.fromEntries(perfumes.map((p) => [p.id, Number(p.price)]))}
          />
        </>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no agregaste proveedores.</p>
          <p className="hint">Usa «+ Nuevo proveedor» y después carga su lista de precios.</p>
        </div>
      ) : (
        <>
          <div className="supplier-picker" role="list">
            {suppliers.map((s) => (
              <Link
                key={s.id}
                role="listitem"
                href={`/admin/proveedores?vista=proveedores&p=${s.id}`}
                className={`supplier-pick${selected?.id === s.id ? ' active' : ''}`}
                aria-current={selected?.id === s.id ? 'true' : undefined}
              >
                <strong>{s.name}</strong>
                <span>
                  {s.product_count} producto{s.product_count === 1 ? '' : 's'} · {s.tier_count} nivel
                  {s.tier_count === 1 ? '' : 'es'}
                </span>
              </Link>
            ))}
          </div>
          {selected ? (
            <SupplierDetail key={selected.id} supplier={selected} prices={prices} perfumes={perfumes} />
          ) : null}
        </>
      )}
    </section>
  );
}
