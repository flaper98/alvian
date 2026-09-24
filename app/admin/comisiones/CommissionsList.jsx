'use client';

import { useEffect, useMemo, useState } from 'react';
import CommissionRow from './CommissionRow';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'ready', label: 'Con monto disponible' },
  { value: 'waiting', label: 'Esperando más cobro' },
  { value: 'paid', label: 'Pagadas por completo' },
];

const PAYMENT_TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pandero', label: 'Pandero' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function hasPayoutDue(sale) {
  return Number(sale.commissionPayoutDue || 0) > 0;
}

export default function CommissionsList({ sales, canEdit }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
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
      ready: searched.filter((s) => hasPayoutDue(s)).length,
      waiting: searched.filter((s) => !s.commission_paid && !hasPayoutDue(s)).length,
      paid: searched.filter((s) => s.commission_paid).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    let filtered = searched.filter((sale) => {
      if (statusFilter === 'ready') return hasPayoutDue(sale);
      if (statusFilter === 'waiting') return !sale.commission_paid && !hasPayoutDue(sale);
      if (statusFilter === 'paid') return sale.commission_paid;
      return true;
    });

    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter((sale) => sale.payment_type === paymentTypeFilter);
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'amount') return Number(b.commissionPayoutDue || 0) - Number(a.commissionPayoutDue || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [searched, statusFilter, paymentTypeFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentTypeFilter, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const subtotal = rows.reduce((sum, sale) => sum + Number(sale.commissionPayoutDue || 0), 0);

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
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="recent">Ordenar: más reciente</option>
          <option value="oldest">Ordenar: más antigua</option>
          <option value="amount">Ordenar: mayor comisión disponible</option>
        </select>
        <select value={paymentTypeFilter} onChange={(event) => setPaymentTypeFilter(event.target.value)}>
          {PAYMENT_TYPE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              Tipo de pago: {filter.label}
            </option>
          ))}
        </select>
        <span className="list-count">
          {rows.length} de {sales.length} venta{sales.length === 1 ? '' : 's'} · S/ {subtotal.toFixed(2)}
        </span>
      </div>

      <div className="filter-chips">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip${statusFilter === filter.value ? ' active' : ''}`}
            onClick={() => setStatusFilter(filter.value)}
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
            <table className="perfume-table table-cards">
              <thead>
                <tr>
                  <th scope="col">Perfume</th>
                  <th scope="col">Comisión total</th>
                  <th scope="col">Pagado</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((sale) => (
                  <CommissionRow key={sale.id} sale={sale} canEdit={canEdit} />
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
