'use client';

import { useEffect, useMemo, useState } from 'react';
import SaleRow from './SaleRow';

const FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pandero', label: 'Pandero' },
  { value: 'pending-delivery', label: 'Pendiente de entrega' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function SalesList({ sales, canManage, users }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

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

  // Vuelve a la página 1 cada vez que cambia la búsqueda, el filtro, el orden
  // o el tamaño de página — para no quedar "varado" en una página vacía.
  useEffect(() => {
    setPage(1);
  }, [search, filterBy, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
        <>
          <div className="perfume-table-wrap">
            <table className="perfume-table">
              <thead>
                <tr>
                  <th scope="col">Perfume</th>
                  <th scope="col">Cant.</th>
                  <th scope="col">Total</th>
                  <th scope="col">Pago</th>
                  <th scope="col">Entrega</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((sale) => (
                  <SaleRow key={sale.id} sale={sale} canManage={canManage} users={users} />
                ))}
              </tbody>
            </table>
          </div>

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
              por página
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
