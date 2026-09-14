'use client';

import { useMemo, useState } from 'react';
import CommissionRow from './CommissionRow';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'ready', label: 'Listas para pagar' },
  { value: 'waiting', label: 'Esperando cobro' },
  { value: 'paid', label: 'Pagadas' },
];

function isFullyCollected(sale) {
  return sale.payment_type === 'contado' || Number(sale.balance) <= 0;
}

export default function CommissionsList({ sales, canEdit }) {
  const [search, setSearch] = useState('');
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
      ready: searched.filter((s) => !s.commission_paid && isFullyCollected(s)).length,
      waiting: searched.filter((s) => !s.commission_paid && !isFullyCollected(s)).length,
      paid: searched.filter((s) => s.commission_paid).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    return searched.filter((sale) => {
      if (filterBy === 'ready') return !sale.commission_paid && isFullyCollected(sale);
      if (filterBy === 'waiting') return !sale.commission_paid && !isFullyCollected(sale);
      if (filterBy === 'paid') return sale.commission_paid;
      return true;
    });
  }, [searched, filterBy]);

  if (sales.length === 0) {
    return <p>Todavía no hay ventas de la vendedora.</p>;
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
            <CommissionRow key={sale.id} sale={sale} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}
