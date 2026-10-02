'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { deleteCashEntryAction } from '@/lib/actions';

const PAGE_SIZE = 25;
// "capital" = dinero tuyo que pusiste en la caja (solo aparece en la Caja).
const KIND_LABELS = { in: 'Ventas y cobros', capital: 'Puse dinero', out: 'Salidas' };
// Movimientos que se pueden borrar desde aquí (el resto se corrige en su sección).
const DELETABLE = new Set(['gasto', 'retiro', 'aporte', 'deuda', 'reparto']);

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isIn = (kind) => kind === 'in' || kind === 'capital';

/** CSV para Excel en español: separador ";" y coma decimal, con BOM para las tildes. */
function downloadCsv(rows, fileName) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Monto'].map(escape).join(';'),
    ...rows.map((r) =>
      [
        r.dateLabel,
        KIND_LABELS[r.kind] || r.kind,
        r.category,
        r.detail,
        (isIn(r.kind) ? r.amount : -r.amount).toFixed(2).replace('.', ','),
      ]
        .map(escape)
        .join(';'),
    ),
  ];
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function DeleteButton({ row }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="pivot-remove ledger-remove"
      aria-label={`Borrar ${row.category} de ${soles(row.amount)}`}
      title="Borrar (si lo registraste por error)"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`¿Borrar "${row.category} · ${row.detail}" de ${soles(row.amount)}?`)) return;
        startTransition(async () => {
          const result = await deleteCashEntryAction(row.src, row.ref);
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      ×
    </button>
  );
}

export default function LedgerTable({ rows, fileName, truncated, hideKindFilter = false, deletable = false }) {
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const kinds = useMemo(() => ['all', ...['in', 'capital', 'out'].filter((k) => rows.some((r) => r.kind === k))], [rows]);
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (kind === 'all' || r.kind === kind) &&
        (category === 'all' || r.category === category) &&
        (!term || r.detail.toLowerCase().includes(term) || r.category.toLowerCase().includes(term)),
    );
  }, [rows, kind, category, search]);

  useEffect(() => setPage(1), [kind, category, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc[r.kind] = (acc[r.kind] || 0) + r.amount;
          return acc;
        },
        { in: 0, capital: 0, out: 0 },
      ),
    [filtered],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (rows.length === 0) {
    return <p className="empty-state">No hay movimientos en este período.</p>;
  }

  return (
    <div className="ledger">
      <div className="supplier-toolbar">
        <input
          type="search"
          placeholder="Buscar (ej: flete, sueldo, Shalom)…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar movimiento"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoría">
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="button" className="btn-secondary" onClick={() => downloadCsv(filtered, fileName)}>
          Descargar Excel (CSV)
        </button>
      </div>

      <div className="ledger-summary">
        {hideKindFilter || kinds.length <= 2 ? null : (
          <div className="filter-chips" role="group" aria-label="Tipo">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className={`filter-chip${kind === k ? ' active' : ''}`}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
              >
                {k === 'all' ? 'Todo' : KIND_LABELS[k]}
              </button>
            ))}
          </div>
        )}
        <p>
          {totals.in ? (
            <>
              <span className="text-good">+ {soles(totals.in)}</span> ·{' '}
            </>
          ) : null}
          {totals.capital ? (
            <>
              <span className="text-good">+ {soles(totals.capital)} puesto por ti</span> ·{' '}
            </>
          ) : null}
          <span className="text-critical">− {soles(totals.out)}</span> · {filtered.length} movimientos
        </p>
      </div>

      <div className="pivot-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Qué fue</th>
              <th scope="col">Detalle</th>
              <th scope="col" className="num">
                Monto
              </th>
              {deletable ? <th scope="col" aria-label="Borrar" /> : null}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={`${r.src || r.category}-${r.ref ?? i}-${i}`}>
                <td className="ledger-date">{r.dateLabel}</td>
                <td>
                  <span className={`ledger-kind ledger-kind-${r.kind}`} aria-hidden="true" />
                  {r.category}
                </td>
                <td className="ledger-detail">{r.detail}</td>
                <td className={`num ${isIn(r.kind) ? 'text-good' : 'text-critical'}`}>
                  {isIn(r.kind) ? '+' : '−'} {soles(r.amount)}
                </td>
                {deletable ? <td className="num">{DELETABLE.has(r.src) ? <DeleteButton row={r} /> : null}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="pagination-bar">
          <span className="pagination-status">
            Página {current} de {pages}
          </span>
          <div className="pagination-controls">
            <button type="button" className="btn-secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              ← Anterior
            </button>
            <button type="button" className="btn-secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Siguiente →
            </button>
          </div>
        </div>
      ) : null}
      {truncated ? (
        <p className="hint">Se muestran los 3,000 movimientos más recientes. Acota el rango de fechas para ver el resto.</p>
      ) : null}
    </div>
  );
}
