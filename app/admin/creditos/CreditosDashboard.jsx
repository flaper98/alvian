'use client';

import { useMemo, useState } from 'react';
import CreditSaleRow from './CreditSaleRow';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'debt', label: 'Con deuda pendiente' },
  { value: 'paid', label: 'Pagado completo' },
];

export default function CreditosDashboard({ customerGroups }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('debt');
  const [filterBy, setFilterBy] = useState('all');

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customerGroups;
    return customerGroups.filter((g) => g.customerName.toLowerCase().includes(term));
  }, [customerGroups, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      debt: searched.filter((g) => g.totalDebt > 0).length,
      paid: searched.filter((g) => g.totalDebt <= 0).length,
    }),
    [searched],
  );

  const groups = useMemo(() => {
    const filtered = searched.filter((g) => {
      if (filterBy === 'debt') return g.totalDebt > 0;
      if (filterBy === 'paid') return g.totalDebt <= 0;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name') return a.customerName.localeCompare(b.customerName);
      return b.totalDebt - a.totalDebt;
    });
  }, [searched, filterBy, sortBy]);

  if (customerGroups.length === 0) {
    return <p>No hay ventas a crédito o pandero registradas.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="debt">Ordenar: mayor deuda primero</option>
          <option value="name">Ordenar: nombre (A-Z)</option>
        </select>
        <span className="list-count">
          {groups.length} de {customerGroups.length} cliente{customerGroups.length === 1 ? '' : 's'}
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

      {groups.length === 0 ? (
        <p className="hint">Ningún cliente coincide con este filtro.</p>
      ) : (
        <ul className="customer-credit-list">
          {groups.map((group) => (
            <li key={group.customerName} className="customer-credit-card">
              <div className="customer-credit-header">
                <strong>{group.customerName}</strong>
                <span className={`badge ${group.totalDebt > 0 ? 'badge-pending' : 'badge-paid'}`}>
                  Deuda total: S/ {group.totalDebt.toFixed(2)}
                </span>
              </div>
              <ul className="history-list">
                {group.sales.map((sale) => (
                  <CreditSaleRow key={sale.id} sale={sale} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
