'use client';

import { useMemo, useState } from 'react';

const soles = (value) =>
  `${Number(value) < 0 ? '−' : ''}S/ ${Math.abs(Number(value) || 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const percent = (value) => `${(value * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });

/** Tabla que se ordena tocando el encabezado. Las columnas `money` y `pct` se formatean solas. */
function SortableTable({ columns, rows, initialSort, rowKey = 'key', limit = 0 }) {
  const [sort, setSort] = useState(initialSort);
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    const value = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
    return [...rows].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      // Los vacíos ("sin costo") siempre al final.
      if (x == null) return 1;
      if (y == null) return -1;
      const cmp = typeof x === 'string' ? x.localeCompare(y, 'es') : x - y;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [columns, rows, sort]);
  const visible = limit && !showAll ? sorted.slice(0, limit) : sorted;

  const toggle = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  return (
    <>
      <div className="pivot-scroll">
        <table className="report-table sales-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.num ? 'num' : undefined}
                  aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortable === false ? (
                    c.label
                  ) : (
                    <button type="button" className="sort-button" onClick={() => toggle(c.key)}>
                      {c.label}
                      <span aria-hidden="true">{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r[rowKey]}>
                {columns.map((c) => {
                  const raw = r[c.key];
                  const content = c.render
                    ? c.render(r, i)
                    : raw == null
                      ? '—'
                      : c.money
                        ? soles(raw)
                        : c.pct
                          ? percent(raw)
                          : raw;
                  const tone = (c.money || c.pct) && raw != null && raw < 0 ? 'text-critical' : undefined;
                  return c.key === columns[0].key ? (
                    <th key={c.key} scope="row" className={c.num ? 'num' : undefined}>
                      {content}
                    </th>
                  ) : (
                    <td key={c.key} className={[c.num ? 'num' : '', tone || ''].join(' ').trim() || undefined}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit && sorted.length > limit ? (
        <button type="button" className="btn-link sales-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Ver menos' : `Ver los ${sorted.length}`}
        </button>
      ) : null}
    </>
  );
}

function ProductCell({ row }) {
  return (
    <span className="sales-product">
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" width={36} height={36} loading="lazy" />
      ) : (
        <span className="stock-noimg" aria-hidden="true" />
      )}
      <span>{row.name}</span>
    </span>
  );
}

// Cada ranking ordena por algo distinto: no es lo mismo lo que más se vende que lo que más deja.
const RANKINGS = {
  units: { label: 'Más vendidos', hint: 'por unidades' },
  revenue: { label: 'Más ingresos', hint: 'por monto vendido' },
  profit: { label: 'Más ganancia', hint: 'por soles ganados' },
  margin: { label: 'Mayor margen', hint: 'por % de ganancia' },
};

/** Ranking de perfumes con botones para cambiar el criterio (y encabezados ordenables). */
export function ProductRanking({ products }) {
  const [mode, setMode] = useState('units');
  const columns = [
    { key: 'pos', label: '#', num: true, sortable: false, render: (_, i) => i + 1 },
    { key: 'name', label: 'Producto', render: (r) => <ProductCell row={r} /> },
    { key: 'category', label: 'Categoría' },
    { key: 'units', label: 'Unid.', num: true },
    { key: 'avgPrice', label: 'Precio prom.', num: true, money: true },
    { key: 'revenue', label: 'Total', num: true, money: true },
    { key: 'profit', label: 'Ganancia', num: true, money: true },
    { key: 'margin', label: 'Margen', num: true, pct: true },
  ];
  if (products.length === 0) return <p className="hint">No hubo ventas con estos filtros.</p>;
  return (
    <>
      <div className="stock-pills" role="group" aria-label="Ordenar ranking">
        {Object.entries(RANKINGS).map(([key, r]) => (
          <button
            key={key}
            type="button"
            className={`stock-pill stock-pill-all${mode === key ? ' is-on' : ''}`}
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
          >
            <strong>{r.label}</strong>
            <span>{r.hint}</span>
          </button>
        ))}
      </div>
      <SortableTable key={mode} columns={columns} rows={products} initialSort={{ key: mode, dir: 'desc' }} limit={10} />
    </>
  );
}

/** Rentabilidad: de dónde sale la ganancia de cada perfume. */
export function ProfitTable({ products }) {
  const columns = [
    { key: 'name', label: 'Producto' },
    { key: 'unitCost', label: 'Costo unit.', num: true, money: true },
    { key: 'avgPrice', label: 'Precio', num: true, money: true },
    { key: 'units', label: 'Unid.', num: true },
    { key: 'revenue', label: 'Ingreso', num: true, money: true },
    { key: 'cost', label: 'Costo total', num: true, money: true },
    { key: 'expenses', label: 'Comisión y envío', num: true, money: true },
    { key: 'profit', label: 'Ganancia', num: true, money: true },
    { key: 'margin', label: 'Margen', num: true, pct: true },
  ];
  if (products.length === 0) return <p className="hint">No hubo ventas con estos filtros.</p>;
  return <SortableTable columns={columns} rows={products} initialSort={{ key: 'profit', dir: 'desc' }} limit={15} />;
}

const CUSTOMER_TAGS = { nuevo: 'Nuevo', recurrente: 'Recurrente' };

export function CustomersTable({ customers }) {
  const columns = [
    {
      key: 'name',
      label: 'Cliente',
      render: (r) => (
        <span className="sales-customer">
          {r.name}
          {r.best ? <span className="sales-tag sales-tag-best">Mejor cliente</span> : null}
          <span className={`sales-tag sales-tag-${r.type}`}>{CUSTOMER_TAGS[r.type]}</span>
        </span>
      ),
    },
    { key: 'orders', label: 'Compras', num: true },
    { key: 'revenue', label: 'Total', num: true, money: true },
    { key: 'averageTicket', label: 'Ticket prom.', num: true, money: true },
    {
      key: 'last',
      label: 'Última compra',
      sortValue: (r) => new Date(r.last).getTime(),
      render: (r) => dateFmt.format(new Date(r.last)),
    },
    { key: 'topProduct', label: 'Más compró' },
  ];
  if (customers.length === 0) return <p className="hint">No hay ventas con nombre de cliente en este período.</p>;
  return (
    <SortableTable columns={columns} rows={customers} initialSort={{ key: 'revenue', dir: 'desc' }} limit={15} />
  );
}

/** CSV para Excel en español: separador ";" y coma decimal, con BOM para las tildes. */
function downloadCsv(sheets, fileName) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const cell = (value) => (typeof value === 'number' ? value.toFixed(2).replace('.', ',') : value);
  const lines = [];
  for (const sheet of sheets) {
    lines.push(escape(sheet.title), sheet.header.map(escape).join(';'));
    for (const row of sheet.rows) lines.push(row.map((v) => escape(cell(v))).join(';'));
    lines.push('');
  }
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Exportar: Excel (CSV con todas las tablas del reporte) y PDF (imprimir → Guardar como PDF). */
export function SalesExport({ report, fileName }) {
  const excel = () =>
    downloadCsv(
      [
        {
          title: 'Resumen',
          header: ['Concepto', 'Monto'],
          rows: report.summary.map((s) => [s.label, s.value]),
        },
        {
          title: 'Productos',
          header: ['Producto', 'Categoría', 'Unidades', 'Precio promedio', 'Costo unitario', 'Ingreso', 'Costo total', 'Ganancia', 'Margen %'],
          rows: report.products.map((p) => [
            p.name,
            p.category,
            String(p.units),
            p.avgPrice,
            p.unitCost ?? '',
            p.revenue,
            p.cost ?? '',
            p.profit ?? '',
            p.margin == null ? '' : p.margin * 100,
          ]),
        },
        {
          title: 'Categorías',
          header: ['Categoría', 'Pedidos', 'Unidades', 'Monto', '%'],
          rows: report.categories.map((c) => [c.label, String(c.count), String(c.units), c.revenue, c.share * 100]),
        },
        {
          title: 'Métodos de pago',
          header: ['Método', 'Operaciones', 'Monto', '%'],
          rows: report.methods.map((m) => [m.label, String(m.count), m.revenue, m.share * 100]),
        },
        {
          title: 'Clientes',
          header: ['Cliente', 'Tipo', 'Compras', 'Total', 'Ticket promedio', 'Última compra', 'Más compró'],
          rows: report.customers.map((c) => [
            c.name,
            `${c.best ? 'Mejor cliente · ' : ''}${CUSTOMER_TAGS[c.type]}`,
            String(c.orders),
            c.revenue,
            c.averageTicket,
            dateFmt.format(new Date(c.last)),
            c.topProduct,
          ]),
        },
        {
          title: 'Pedidos web por estado',
          header: ['Estado', 'Cantidad', 'Monto'],
          rows: report.orderStatuses.map((o) => [o.label, String(o.count), o.total]),
        },
      ],
      fileName,
    );
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Exportar PDF
      </button>
      <button type="button" className="btn-secondary" onClick={excel}>
        Exportar Excel
      </button>
    </>
  );
}
