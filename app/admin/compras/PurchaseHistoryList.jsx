'use client';

import { useMemo, useState } from 'react';

export default function PurchaseHistoryList({ purchases }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const rows = useMemo(() => {
    const filtered = search.trim()
      ? purchases.filter((p) => p.perfume_name.toLowerCase().includes(search.trim().toLowerCase()))
      : purchases;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'cost') return Number(b.landed_unit_cost) - Number(a.landed_unit_cost);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [purchases, search, sortBy]);

  if (purchases.length === 0) {
    return <p>Todavía no hay compras registradas.</p>;
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
          <option value="recent">Ordenar: más reciente</option>
          <option value="oldest">Ordenar: más antigua</option>
          <option value="cost">Ordenar: mayor costo real</option>
        </select>
        <span className="list-count">
          {rows.length} de {purchases.length} compra{purchases.length === 1 ? '' : 's'}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="hint">Ninguna compra coincide con &quot;{search}&quot;.</p>
      ) : (
        <ul className="history-list">
          {rows.map((purchase) => (
            <li key={purchase.id} className="history-row">
              <div>
                <strong>{purchase.perfume_name}</strong>
                <span>
                  {' '}
                  · {purchase.quantity} unid. · S/ {Number(purchase.unit_cost).toFixed(2)} c/u
                  {Number(purchase.freight_cost) > 0 ? (
                    <>
                      {' '}
                      + S/ {Number(purchase.freight_cost).toFixed(2)} flete = S/{' '}
                      {Number(purchase.landed_unit_cost).toFixed(2)} c/u real
                    </>
                  ) : null}
                </span>
                {purchase.note ? <p>{purchase.note}</p> : null}
              </div>
              <time>{new Date(purchase.created_at).toLocaleDateString('es-PE')}</time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
