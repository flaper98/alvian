'use client';

import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 25;
const KINDS = [
  { value: 'all', label: 'Todo' },
  { value: 'in', label: 'Ingresos' },
  { value: 'out', label: 'Salidas' },
];

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** CSV para Excel en español: separador ";" y coma decimal, con BOM para las tildes. */
function downloadCsv(rows, fileName) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Fecha', 'Tipo', 'Categoría', 'Detalle', 'Monto'].map(escape).join(';'),
    ...rows.map((r) =>
      [
        r.dateLabel,
        r.kind === 'in' ? 'Ingreso' : 'Salida',
        r.category,
        r.detail,
        (r.kind === 'in' ? r.amount : -r.amount).toFixed(2).replace('.', ','),
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

export default function LedgerTable({ rows, fileName, truncated }) {
  const [kind, setKind] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (kind === 'all' || r.kind === kind) &&
        (category === 'all' || r.category === category) &&
        (!term || r.detail.toLowerCase().includes(term)),
    );
  }, [rows, kind, category, search]);

  useEffect(() => setPage(1), [kind, category, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc[r.kind] += r.amount;
          return acc;
        },
        { in: 0, out: 0 },
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
          placeholder="Buscar en el detalle…"
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
        <div className="filter-chips" role="group" aria-label="Tipo">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              className={`filter-chip${kind === k.value ? ' active' : ''}`}
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <p>
          <span className="text-good">+ {soles(totals.in)}</span> ·{' '}
          <span className="text-critical">− {soles(totals.out)}</span> · {filtered.length} movimientos
        </p>
      </div>

      <div className="pivot-scroll">
        <table className="ledger-table">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Categoría</th>
              <th scope="col">Detalle</th>
              <th scope="col" className="num">
                Monto
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={`${r.dateLabel}-${i}`}>
                <td className="ledger-date">{r.dateLabel}</td>
                <td>
                  <span className={`ledger-kind ledger-kind-${r.kind}`} aria-hidden="true" />
                  {r.category}
                </td>
                <td className="ledger-detail">{r.detail}</td>
                <td className={`num ${r.kind === 'in' ? 'text-good' : 'text-critical'}`}>
                  {r.kind === 'in' ? '+' : '−'} {soles(r.amount)}
                </td>
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
