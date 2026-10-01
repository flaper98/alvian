'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { pickSupplierOption } from '@/lib/supplier-pricing';
import AddMissingToCatalog from './AddMissingToCatalog';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'catalog', label: 'En mi catálogo' },
  { value: 'missing', label: 'Me falta agregar' },
  { value: 'multi', label: 'Con varios proveedores' },
];

const money = (value) => Number(value).toFixed(2);

const MODES = [
  { value: 'mayor', label: 'Por mayor (desde 6)' },
  { value: 'volumen', label: 'Mejor precio por volumen' },
];

function purchaseHref(row) {
  return row.unlinked
    ? `/admin/catalogo?name=${encodeURIComponent(row.perfumeName)}`
    : `/admin/compras?perfumeId=${row.perfumeId}&unitCost=${row.cheapest.price}&note=${encodeURIComponent(
        `${row.cheapest.supplierName} · ${row.cheapest.tierLabel}`,
      )}`;
}

export default function PriceComparison({ comparison, catalogPrices = {} }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [mode, setMode] = useState('mayor');

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
    return comparison
      .map((row) => {
        // Un precio por proveedor, elegido según el modo (ver lib/supplier-pricing.js).
        const optionsBySupplier = new Map();
        for (const option of row.options) {
          const list = optionsBySupplier.get(option.supplierId) || [];
          list.push(option);
          optionsBySupplier.set(option.supplierId, list);
        }
        const bySupplier = new Map();
        for (const [supplierId, options] of optionsBySupplier) {
          const picked = pickSupplierOption(options, mode);
          if (picked) bySupplier.set(supplierId, picked);
        }
        if (bySupplier.size === 0) return null;
        const perSupplierPrices = Array.from(bySupplier.values());
        const cheapest = perSupplierPrices.reduce((min, opt) =>
          Number(opt.price) < Number(min.price) ? opt : min,
        );
        const priciest = perSupplierPrices.reduce((max, opt) =>
          Number(opt.price) > Number(max.price) ? opt : max,
        );
        return { ...row, bySupplier, cheapest, savings: Number(priciest.price) - Number(cheapest.price) };
      })
      .filter(Boolean);
  }, [comparison, mode]);

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

    const bySupplierFilter =
      supplierFilter === 'all'
        ? filtered
        : filtered.filter((row) => row.cheapest.supplierId === Number(supplierFilter));

    return [...bySupplierFilter].sort((a, b) => {
      if (sortBy === 'savings') return b.savings - a.savings;
      return a.perfumeName.localeCompare(b.perfumeName);
    });
  }, [searched, filterBy, sortBy, supplierFilter]);

  if (comparison.length === 0) {
    return (
      <div className="empty-state">
        <p>Todavía no hay precios para comparar.</p>
        <p className="hint">Ve a «Mis proveedores» y carga la lista de precios de cada uno.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="segmented comparison-mode" role="tablist" aria-label="Qué precio comparar">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            className={mode === m.value ? 'active' : ''}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="hint comparison-mode-hint">
        {mode === 'mayor'
          ? 'Precio por mayor de entrada de cada proveedor (Por mayor, 6 a 11…), sin contar el precio por unidad.'
          : 'El precio más bajo de cada proveedor, en su nivel de mayor volumen (12+, 5K, 30K…).'}
      </p>

      <div className="supplier-toolbar">
        <input
          type="search"
          placeholder={`Buscar en ${comparison.length} perfumes…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar perfume"
        />
        <select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} aria-label="Más barato en">
          <option value="all">Más barato en: cualquiera</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              Más barato en: {supplier.name}
            </option>
          ))}
        </select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Ordenar">
          <option value="name">Orden: A-Z</option>
          <option value="savings">Orden: mayor ahorro</option>
        </select>
        <AddMissingToCatalog comparison={comparison} catalogPrices={catalogPrices} />
      </div>

      <div className="filter-chips" role="group" aria-label="Filtrar">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip${filterBy === filter.value ? ' active' : ''}`}
            aria-pressed={filterBy === filter.value}
            onClick={() => setFilterBy(filter.value)}
          >
            {filter.label} <span className="filter-chip-count">{filterCounts[filter.value]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="hint">
          {search.trim() ? <>Ningún perfume coincide con &quot;{search}&quot;.</> : 'Ningún perfume coincide con este filtro.'}
        </p>
      ) : (
        <>
          <div className="comparison-table-scroll">
            <table className="comparison-matrix">
              <thead>
                <tr>
                  <th className="comparison-matrix-sticky">Perfume</th>
                  {suppliers.map((supplier) => (
                    <th key={supplier.id}>{supplier.name}</th>
                  ))}
                  <th>Ahorras</th>
                  <th aria-label="Acción" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.perfumeId ?? `u-${row.perfumeName}`}>
                    <td className="comparison-matrix-sticky">
                      <strong>{row.perfumeName}</strong>
                      {row.unlinked ? <span className="pivot-flag">Sin catálogo</span> : null}
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
                      const isCheapest = row.bySupplier.size > 1 && option.id === row.cheapest.id;
                      return (
                        <td key={supplier.id} className={isCheapest ? 'comparison-min-cell' : ''}>
                          {money(option.price)}
                          <small className="comparison-tier">{option.tierLabel}</small>
                        </td>
                      );
                    })}
                    <td className="comparison-savings">{row.savings > 0 ? `S/ ${money(row.savings)}` : '—'}</td>
                    <td>
                      <Link href={purchaseHref(row)} className="btn-secondary comparison-buy-link">
                        {row.unlinked ? 'Agregar' : 'Comprar'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="comparison-list">
            {rows.map((row) => (
              <li key={row.perfumeId ?? `u-${row.perfumeName}`}>
                <details>
                  <summary>
                    <span className="comparison-list-name">
                      {row.perfumeName}
                      {row.unlinked ? <span className="pivot-flag">Sin catálogo</span> : null}
                    </span>
                    <span className="comparison-list-best">
                      <strong>S/ {money(row.cheapest.price)}</strong>
                      <small>{row.cheapest.supplierName}</small>
                    </span>
                  </summary>
                  <div className="comparison-list-body">
                    {suppliers.map((supplier) => {
                      const option = row.bySupplier.get(supplier.id);
                      if (!option) return null;
                      return (
                        <p key={supplier.id} className={option.id === row.cheapest.id ? 'is-best' : ''}>
                          <span>
                            {supplier.name} <small>({option.tierLabel})</small>
                          </span>
                          <span>S/ {money(option.price)}</span>
                        </p>
                      );
                    })}
                    {row.savings > 0 ? <p className="hint">Ahorras S/ {money(row.savings)} frente al más caro.</p> : null}
                    <Link href={purchaseHref(row)} className="btn-primary comparison-buy-link">
                      {row.unlinked ? 'Agregar a catálogo' : 'Registrar compra'}
                    </Link>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <p className="pivot-footnote">
            {rows.length} de {comparison.length} perfumes · precios en soles
          </p>
        </>
      )}
    </div>
  );
}
