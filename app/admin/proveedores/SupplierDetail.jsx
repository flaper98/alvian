'use client';

import { useMemo, useState, useTransition } from 'react';
import { deleteSupplierAction, deleteSupplierPriceAction } from '@/lib/actions';
import SupplierPricesModal from './SupplierPricesModal';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'catalog', label: 'En mi catálogo' },
  { value: 'unlinked', label: 'Sin catálogo' },
];

/** Agrupa los precios (una fila por producto + nivel) en una fila por
 * producto con una columna por nivel. Los niveles se ordenan del más caro al
 * más barato (en promedio): Unidad → 6 a 11 → 12+, o Por mayor → 5K → 30K. */
function buildPivot(prices) {
  const tierTotals = new Map();
  const products = new Map();
  for (const price of prices) {
    const value = Number(price.price);
    const t = tierTotals.get(price.tier_label) || { sum: 0, n: 0 };
    tierTotals.set(price.tier_label, { sum: t.sum + value, n: t.n + 1 });

    const key = price.perfume_id != null ? `p${price.perfume_id}` : `u${price.perfume_name.toLowerCase()}`;
    if (!products.has(key)) {
      products.set(key, { key, name: price.perfume_name, unlinked: price.unlinked, byTier: {} });
    }
    products.get(key).byTier[price.tier_label] = price;
  }
  const tiers = [...tierTotals.entries()]
    .sort(([a, ta], [b, tb]) => tb.sum / tb.n - ta.sum / ta.n || a.localeCompare(b, 'es'))
    .map(([label]) => label);
  const rows = [...products.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return { tiers, rows };
}

function PriceCell({ price }) {
  const [isPending, startTransition] = useTransition();
  if (!price) return <td className="pivot-empty">—</td>;
  return (
    <td className={`pivot-price${isPending ? ' is-pending' : ''}`}>
      <span>{Number(price.price).toFixed(2)}</span>
      <button
        type="button"
        className="pivot-remove"
        aria-label={`Quitar precio ${price.tier_label} de ${price.perfume_name}`}
        title="Quitar este precio"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`¿Quitar el precio "${price.tier_label}" de ${price.perfume_name}?`)) return;
          startTransition(async () => {
            await deleteSupplierPriceAction(price.id);
          });
        }}
      >
        ×
      </button>
    </td>
  );
}

export default function SupplierDetail({ supplier, prices, perfumes }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const { tiers, rows } = useMemo(() => buildPivot(prices), [prices]);
  const counts = useMemo(
    () => ({
      all: rows.length,
      catalog: rows.filter((r) => !r.unlinked).length,
      unlinked: rows.filter((r) => r.unlinked).length,
    }),
    [rows],
  );
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'catalog' && r.unlinked) return false;
      if (filter === 'unlinked' && !r.unlinked) return false;
      return !term || r.name.toLowerCase().includes(term);
    });
  }, [rows, search, filter]);

  function handleDeleteSupplier() {
    if (!window.confirm(`¿Eliminar al proveedor "${supplier.name}" y todos sus precios?`)) return;
    startDelete(async () => {
      await deleteSupplierAction(supplier.id);
    });
  }

  return (
    <div className="supplier-detail">
      <header className="supplier-detail-head">
        <div>
          <h2>{supplier.name}</h2>
          {supplier.note ? <p className="hint">{supplier.note}</p> : null}
        </div>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          + Cargar precios
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>Este proveedor todavía no tiene precios.</p>
          <p className="hint">Pulsa «Cargar precios» y pega su lista: una línea por producto.</p>
        </div>
      ) : (
        <>
          <div className="supplier-toolbar">
            <input
              type="search"
              placeholder={`Buscar en ${rows.length} productos…`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar producto"
            />
            <div className="filter-chips" role="group" aria-label="Filtrar">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`filter-chip${filter === f.value ? ' active' : ''}`}
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label} <span className="filter-chip-count">{counts[f.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="hint">Ningún producto coincide con la búsqueda.</p>
          ) : (
            <div className="pivot-scroll">
              <table className="pivot-table">
                <thead>
                  <tr>
                    <th scope="col" className="pivot-name">
                      Producto
                    </th>
                    {tiers.map((tier) => (
                      <th key={tier} scope="col" className="pivot-tier">
                        {tier}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className="pivot-name">
                        {row.name}
                        {row.unlinked ? (
                          <span className="pivot-flag" title="No está en tu catálogo">
                            Sin catálogo
                          </span>
                        ) : null}
                      </th>
                      {tiers.map((tier) => (
                        <PriceCell key={tier} price={row.byTier[tier]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="pivot-footnote">Precios en soles · {visible.length} de {rows.length} productos · para quitar un precio, usa la × junto a él.</p>
        </>
      )}

      <div className="supplier-danger">
        <button type="button" className="btn-link-danger" onClick={handleDeleteSupplier} disabled={isDeleting}>
          {isDeleting ? 'Eliminando…' : 'Eliminar proveedor'}
        </button>
      </div>

      {modalOpen ? (
        <SupplierPricesModal
          supplier={supplier}
          perfumes={perfumes}
          tiers={tiers}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
