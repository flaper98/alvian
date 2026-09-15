'use client';

import { useEffect, useMemo, useState } from 'react';
import CreditSaleRow from './CreditSaleRow';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'debt', label: 'Con deuda pendiente' },
  { value: 'paid', label: 'Pagado completo' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
        <>
          <ul className="customer-credit-list">
            {pageGroups.map((group) => (
              <li key={group.customerName} className="customer-credit-card">
                <div className="customer-credit-header">
                  <strong>{group.customerName}</strong>
                  <span className={`badge ${group.totalDebt > 0 ? 'badge-pending' : 'badge-paid'}`}>
                    Deuda total: S/ {group.totalDebt.toFixed(2)}
                  </span>
                </div>
                <div className="perfume-table-wrap">
                  <table className="perfume-table">
                    <thead>
                      <tr>
                        <th scope="col">Perfume</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Total</th>
                        <th scope="col">Pagado</th>
                        <th scope="col">Saldo</th>
                        <th scope="col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.sales.map((sale) => (
                        <CreditSaleRow key={sale.id} sale={sale} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </li>
            ))}
          </ul>

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
        </>
      )}
    </div>
  );
}
