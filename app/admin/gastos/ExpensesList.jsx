'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { deleteExpenseAction } from '@/lib/actions';
import { PaidWithBadge } from '../PaidWithField';
import EditExpenseModal from './EditExpenseModal';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function ExpenseTableRow({ expense }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;
    startTransition(async () => {
      try {
        const result = await deleteExpenseAction(expense.id);
        if (result?.error) alert(result.error);
      } catch (err) {
        alert(err.message || 'No se pudo eliminar el gasto.');
      }
    });
  }

  return (
    <>
      <tr className="perfume-table-row">
        <td className="table-cards-title">
          <strong>{expense.description}</strong>{' '}
          <PaidWithBadge value={expense.paid_with} />
          {expense.note ? <p className="perfume-table-description">{expense.note}</p> : null}
        </td>
        <td className="perfume-table-price-cell" data-label="Monto">
          S/ {Number(expense.amount).toFixed(2)}
        </td>
        <td className="perfume-table-stock-cell" data-label="Fecha">
          {new Date(expense.created_at).toLocaleDateString('es-PE')}
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </td>
      </tr>
      {editing ? <EditExpenseModal expense={expense} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

export default function ExpensesList({ expenses }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? expenses.filter((e) => e.description.toLowerCase().includes(term))
      : expenses;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'amount') return Number(b.amount) - Number(a.amount);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [expenses, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalAmount = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  if (expenses.length === 0) {
    return <p>Todavía no hay gastos registrados.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar gasto..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="recent">Ordenar: más reciente</option>
          <option value="oldest">Ordenar: más antiguo</option>
          <option value="amount">Ordenar: mayor monto</option>
        </select>
        <span className="list-count">
          {rows.length} de {expenses.length} gasto{expenses.length === 1 ? '' : 's'} · S/{' '}
          {totalAmount.toFixed(2)}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="hint">Ningún gasto coincide con &quot;{search}&quot;.</p>
      ) : (
        <>
          <div className="perfume-table-wrap">
            <table className="perfume-table table-cards">
              <thead>
                <tr>
                  <th scope="col">Descripción</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((expense) => (
                  <ExpenseTableRow key={expense.id} expense={expense} />
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
