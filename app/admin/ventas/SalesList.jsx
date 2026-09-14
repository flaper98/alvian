'use client';

import { useMemo, useState } from 'react';
import SaleRow from './SaleRow';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pandero', label: 'Pandero' },
  { value: 'pending-delivery', label: 'Pendiente de entrega' },
];

export default function SalesList({ sales, canManage, users }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter(
      (s) =>
        s.perfume_name.toLowerCase().includes(term) ||
        (s.customer_name || '').toLowerCase().includes(term),
    );
  }, [sales, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      contado: searched.filter((s) => s.payment_type === 'contado').length,
      credito: searched.filter((s) => s.payment_type === 'credito').length,
      pandero: searched.filter((s) => s.payment_type === 'pandero').length,
      'pending-delivery': searched.filter((s) => !s.delivered).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    const filtered = searched.filter((sale) => {
      if (filterBy === 'pending-delivery') return !sale.delivered;
      if (filterBy === 'all') return true;
      return sale.payment_type === filterBy;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'amount') return Number(b.total) - Number(a.total);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [searched, filterBy, sortBy]);

  if (sales.length === 0) {
    return <p>Todavía no hay ventas registradas.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar cliente o perfume..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="recent">Ordenar: más reciente</option>
          <option value="oldest">Ordenar: más antigua</option>
          <option value="amount">Ordenar: mayor monto</option>
        </select>
        <span className="list-count">
          {rows.length} de {sales.length} venta{sales.length === 1 ? '' : 's'}
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
        <p className="hint">Ninguna venta coincide con este filtro.</p>
      ) : (
        <ul className="history-list">
          {rows.map((sale) => (
            <SaleRow key={sale.id} sale={sale} canManage={canManage} users={users} />
          ))}
        </ul>
      )}
    </div>
  );
}
