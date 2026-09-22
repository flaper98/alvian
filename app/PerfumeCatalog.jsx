'use client';

import { useMemo, useState } from 'react';
import PerfumeCard from './PerfumeCard';

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
];

export default function PerfumeCatalog({ perfumes }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevancia');

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return perfumes;
    return perfumes.filter((perfume) => perfume.name.toLowerCase().includes(term));
  }, [perfumes, search]);

  const categoryCounts = useMemo(
    () => ({
      all: searched.length,
      hombre: searched.filter((p) => p.category === 'hombre').length,
      mujer: searched.filter((p) => p.category === 'mujer').length,
      unisex: searched.filter((p) => p.category === 'unisex').length,
    }),
    [searched],
  );

  const filtered = useMemo(() => {
    const byCategory =
      category === 'all' ? searched : searched.filter((p) => p.category === category);

    return [...byCategory].sort((a, b) => {
      if (sortBy === 'price-asc') return Number(a.price) - Number(b.price);
      if (sortBy === 'price-desc') return Number(b.price) - Number(a.price);
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      return 0; // "Relevancia": conserva el orden ya definido (nombre A-Z).
    });
  }, [searched, category, sortBy]);

  return (
    <>
      <div className="catalog-controls">
        <div className="list-toolbar">
          <input
            type="search"
            placeholder="Buscar perfume..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar perfume"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            aria-label="Ordenar por"
          >
            <option value="relevancia">Ordenar: relevancia</option>
            <option value="price-asc">Ordenar: menor precio</option>
            <option value="price-desc">Ordenar: mayor precio</option>
            <option value="newest">Ordenar: más nuevos</option>
          </select>
        </div>

        <div className="filter-chips">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`filter-chip${category === filter.value ? ' active' : ''}`}
              onClick={() => setCategory(filter.value)}
            >
              {filter.label} <span className="filter-chip-count">{categoryCounts[filter.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">
          {search.trim()
            ? <>Ningún perfume coincide con &quot;{search}&quot;.</>
            : 'Ningún perfume coincide con este filtro.'}
        </p>
      ) : (
        <div className="catalog-grid">
          {filtered.map((perfume) => (
            <PerfumeCard key={perfume.id} perfume={perfume} />
          ))}
        </div>
      )}
    </>
  );
}
