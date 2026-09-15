'use client';

import { useMemo, useState } from 'react';
import PerfumeCard from './PerfumeCard';

export default function PerfumeCatalog({ perfumes }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return perfumes;
    return perfumes.filter((perfume) => perfume.name.toLowerCase().includes(term));
  }, [perfumes, search]);

  return (
    <>
      <div className="catalog-search">
        <input
          type="search"
          placeholder="Buscar perfume..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar perfume"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">Ningún perfume coincide con &quot;{search}&quot;.</p>
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
