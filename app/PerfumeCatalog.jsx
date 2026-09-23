'use client';

import { useEffect, useMemo, useState } from 'react';
import PerfumeCard from './PerfumeCard';

const CATEGORY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'hombre', label: 'Para él' },
  { value: 'mujer', label: 'Para ella' },
  { value: 'unisex', label: 'Unisex' },
];

const VALID = new Set(CATEGORY_FILTERS.map((f) => f.value));

/** Evento que disparan las tarjetas de categoría de la portada. */
export const CATEGORY_EVENT = 'alvian:categoria';

export default function PerfumeCatalog({ perfumes }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevancia');

  // Permite enlazar directo a una categoría (/?categoria=mujer#catalogo) y
  // escuchar las tarjetas "Para él / Para ella / Unisex" de la portada.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('categoria');
    if (fromUrl && VALID.has(fromUrl)) setCategory(fromUrl);
    const onPick = (event) => {
      if (VALID.has(event.detail)) {
        setCategory(event.detail);
        setSearch('');
      }
    };
    window.addEventListener(CATEGORY_EVENT, onPick);
    return () => window.removeEventListener(CATEGORY_EVENT, onPick);
  }, []);

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
      <div className="sf-catalog-controls">
        <div className="sf-catalog-search">
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

        <div className="sf-chips" role="group" aria-label="Filtrar por categoría">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`sf-chip${category === filter.value ? ' active' : ''}`}
              aria-pressed={category === filter.value}
              onClick={() => setCategory(filter.value)}
            >
              {filter.label} <span className="sf-chip-count">{categoryCounts[filter.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="sf-empty">
          {search.trim()
            ? <>Ningún perfume coincide con &quot;{search}&quot;.</>
            : 'Ningún perfume coincide con este filtro.'}
        </p>
      ) : (
        <div className="sf-grid">
          {filtered.map((perfume) => (
            <PerfumeCard key={perfume.id} perfume={perfume} />
          ))}
        </div>
      )}
    </>
  );
}
