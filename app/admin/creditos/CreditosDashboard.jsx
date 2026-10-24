'use client';

import { useEffect, useMemo, useState } from 'react';
import CreditSaleRow from './CreditSaleRow';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'debt', label: 'Con deuda pendiente' },
  { value: 'paid', label: 'Pagado completo' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

function CustomerCard({ group }) {
  const owing = group.sales.filter((s) => Number(s.balance) > 0).length;
  const paid = group.sales.length - owing;
  const parts = [];
  if (owing) parts.push(`${owing} perfume${owing === 1 ? '' : 's'} con saldo`);
  if (paid) parts.push(`${paid} pagado${paid === 1 ? '' : 's'}`);
  const settled = group.totalDebt <= 0;
  return (
    <li className={`credit-customer${settled ? ' is-settled' : ''}`}>
      <div className="credit-customer-head">
        <span className="credit-avatar" aria-hidden="true">
          {initials(group.customerName)}
        </span>
        <div className="credit-customer-name">
          <strong>{group.customerName}</strong>
          <small>{parts.join(' · ')}</small>
        </div>
        <div className="credit-customer-debt">
          {settled ? (
            <span className="credit-settled">✓ Al día</span>
          ) : (
            <>
              <small>Debe</small>
              <strong>{soles(group.totalDebt)}</strong>
            </>
          )}
        </div>
      </div>
      <ul className="credit-rows">
        {group.sales.map((sale) => (
          <CreditSaleRow key={sale.id} sale={sale} />
        ))}
      </ul>
    </li>
  );
}

export default function CreditosDashboard({ customerGroups }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('debt');
  const [filterBy, setFilterBy] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search, filterBy, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = groups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (customerGroups.length === 0) {
    return <p className="hint">No hay ventas a crédito o pandero registradas.</p>;
  }

  return (
    <div className="credits-board">
      <div className="credits-toolbar">
        <div className="segmented" role="group" aria-label="Filtrar clientes">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={filterBy === filter.value ? 'is-on' : undefined}
              aria-pressed={filterBy === filter.value}
              onClick={() => setFilterBy(filter.value)}
            >
              {filter.label} <span className="segmented-count">{filterCounts[filter.value]}</span>
            </button>
          ))}
        </div>
        <div className="credits-search">
          <input
            type="search"
            placeholder="Buscar cliente..."
            aria-label="Buscar cliente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Ordenar">
            <option value="debt">Mayor deuda primero</option>
            <option value="name">Nombre (A-Z)</option>
          </select>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="hint">Ningún cliente coincide con este filtro.</p>
      ) : (
        <>
          <div className="credit-columns" aria-hidden="true">
            <span>Perfume</span>
            <span>Total</span>
            <span>Pagado</span>
            <span>Saldo</span>
            <span />
          </div>
          <ul className="credit-customers">
            {pageGroups.map((group) => (
              <CustomerCard key={group.customerName} group={group} />
            ))}
          </ul>

          {groups.length > PAGE_SIZE_OPTIONS[0] ? (
            <div className="pagination-bar">
              <label className="pagination-size">
                Mostrar
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                clientes por página
              </label>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  ← Anterior
                </button>
                <span className="pagination-status">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
