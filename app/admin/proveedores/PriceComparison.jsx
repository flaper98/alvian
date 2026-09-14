'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'catalog', label: 'En mi catálogo' },
  { value: 'missing', label: 'Me falta agregar' },
  { value: 'multi', label: 'Con varios proveedores' },
];

export default function PriceComparison({ comparison }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');

  const suppliers = useMemo(() => {
    const seen = new Map();
    for (const row of comparison) {
      for (const option of row.options) {
        if (!seen.has(option.supplierId)) seen.set(option.supplierId, option.supplierName);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [comparison]);

  const withStats = useMemo(() => {
    return comparison.map((row) => {
      // Precio más bajo que ofrece cada proveedor para este perfume (un
      // proveedor puede tener varios niveles; nos interesa su mejor precio).
      const bySupplier = new Map();
      for (const option of row.options) {
        const current = bySupplier.get(option.supplierId);
        if (!current || Number(option.price) < Number(current.price)) {
          bySupplier.set(option.supplierId, option);
        }
      }
      const perSupplierPrices = Array.from(bySupplier.values());
      const cheapest = perSupplierPrices.reduce((min, opt) =>
        Number(opt.price) < Number(min.price) ? opt : min,
      );
      const priciest = perSupplierPrices.reduce((max, opt) =>
        Number(opt.price) > Number(max.price) ? opt : max,
      );
      const average =
        perSupplierPrices.reduce((sum, opt) => sum + Number(opt.price), 0) / perSupplierPrices.length;

      return { ...row, bySupplier, cheapest, priciest, average, savings: Number(priciest.price) - Number(cheapest.price) };
    });
  }, [comparison]);

  const searched = useMemo(() => {
    return search.trim()
      ? withStats.filter((row) => row.perfumeName.toLowerCase().includes(search.trim().toLowerCase()))
      : withStats;
  }, [withStats, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      catalog: searched.filter((row) => !row.unlinked).length,
      missing: searched.filter((row) => row.unlinked).length,
      multi: searched.filter((row) => row.bySupplier.size > 1).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    const filtered = searched.filter((row) => {
      if (filterBy === 'catalog') return !row.unlinked;
      if (filterBy === 'missing') return row.unlinked;
      if (filterBy === 'multi') return row.bySupplier.size > 1;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'savings') return b.savings - a.savings;
      return a.perfumeName.localeCompare(b.perfumeName);
    });
  }, [searched, filterBy, sortBy]);

  if (comparison.length === 0) {
    return <p>Todavía no hay precios registrados para comparar.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar perfume..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="name">Ordenar: nombre (A-Z)</option>
          <option value="savings">Ordenar: mayor ahorro primero</option>
        </select>
        <span className="list-count">
          {rows.length} de {comparison.length} perfume{comparison.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="filter-chips">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip${filterBy === filter.value ? ' active' : ''}`}
            onClick={() => setFilterBy(filter.value)}
          >
            {filter.label} <span className="filter-chip-count">{filterCounts[filter.value]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="hint">
          {search.trim()
            ? <>Ningún perfume coincide con &quot;{search}&quot;.</>
            : 'Ningún perfume coincide con este filtro.'}
        </p>
      ) : (
        <div className="comparison-table-scroll">
          <table className="comparison-matrix">
            <thead>
              <tr>
                <th className="comparison-matrix-sticky">Perfume</th>
                {suppliers.map((supplier) => (
                  <th key={supplier.id}>{supplier.name}</th>
                ))}
                <th>Mínimo</th>
                <th>Promedio</th>
                <th>Máximo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const purchaseHref = row.unlinked
                  ? `/admin/catalogo?name=${encodeURIComponent(row.perfumeName)}`
                  : `/admin/compras?perfumeId=${row.perfumeId}&unitCost=${row.cheapest.price}&note=${encodeURIComponent(
                      `${row.cheapest.supplierName} · ${row.cheapest.tierLabel}`,
                    )}`;
                return (
                  <tr key={row.perfumeId ?? `u-${row.perfumeName}`}>
                    <td className="comparison-matrix-sticky">
                      <strong>{row.perfumeName}</strong>
                      {row.unlinked ? <span className="badge badge-pending"> Sin catálogo</span> : null}
                    </td>
                    {suppliers.map((supplier) => {
                      const option = row.bySupplier.get(supplier.id);
                      if (!option) {
                        return (
                          <td key={supplier.id} className="comparison-empty-cell">
                            —
                          </td>
                        );
                      }
                      const isCheapest = option.id === row.cheapest.id;
                      return (
                        <td key={supplier.id} className={isCheapest ? 'comparison-min-cell' : ''}>
                          S/ {Number(option.price).toFixed(2)}
                          <span className="hint"> ({option.tierLabel})</span>
                        </td>
                      );
                    })}
                    <td className="comparison-min-cell">
                      S/ {Number(row.cheapest.price).toFixed(2)}
                      <span className="hint"> {row.cheapest.supplierName}</span>
                    </td>
                    <td>S/ {row.average.toFixed(2)}</td>
                    <td className="comparison-max-cell">
                      S/ {Number(row.priciest.price).toFixed(2)}
                      <span className="hint"> {row.priciest.supplierName}</span>
                    </td>
                    <td>
                      <Link href={purchaseHref} className="btn-primary comparison-buy-link">
                        {row.unlinked ? 'Agregar a catálogo' : 'Comprar'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
