'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cashPurposeLabel } from '@/lib/cash-purposes';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });

const KINDS = [
  { key: 'aporte', label: 'Puse dinero', hint: 'Dinero tuyo que entró a la caja' },
  { key: 'compra', label: 'Compras de perfumes', hint: 'Pagadas de tu bolsillo' },
  { key: 'gasto', label: 'Gastos del negocio', hint: 'Pagados de tu bolsillo' },
  { key: 'deuda', label: 'Pagos de deudas', hint: 'Pagados de tu bolsillo' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.key, k.label]));

// Mes en hora de Lima ('2026-09') para filtrar por período.
const monthOf = (date) => new Date(new Date(date).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 7);
const PERIODS = [
  { key: 'mes', label: 'Este mes' },
  { key: 'mes-pasado', label: 'Mes pasado' },
  { key: 'todo', label: 'Todo' },
];

function periodMonth(period) {
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  if (period === 'mes-pasado') {
    now.setUTCDate(1);
    now.setUTCMonth(now.getUTCMonth() - 1);
  }
  return now.toISOString().slice(0, 7);
}

function detailOf(row) {
  if (row.kind === 'aporte') return `${cashPurposeLabel('aporte', row.purpose)} · ${row.detail}`;
  return row.detail;
}

/** Lista de todo lo que pusiste, con totales por tipo y filtros. */
export default function OwnMoneyBoard({ rows, borrowed = 0 }) {
  const [period, setPeriod] = useState('todo');
  const [kind, setKind] = useState('all');

  const inPeriod = useMemo(
    () => (period === 'todo' ? rows : rows.filter((r) => monthOf(r.t) === periodMonth(period))),
    [rows, period],
  );
  const visible = kind === 'all' ? inPeriod : inPeriod.filter((r) => r.kind === kind);
  const totalOf = (list) => list.reduce((sum, r) => sum + Number(r.amount), 0);
  const total = totalOf(inPeriod);

  function exportCsv() {
    const lines = [['Fecha', 'Tipo', 'Detalle', 'Monto']].concat(
      visible.map((r) => [dateFmt.format(new Date(r.t)), KIND_LABEL[r.kind], detailOf(r), Number(r.amount).toFixed(2)]),
    );
    const csv = lines.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tu-dinero-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="own-money">
      <div className="filter-chips" role="group" aria-label="Período">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`filter-chip${period === p.key ? ' active' : ''}`}
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi-tile kpi-tile-good">
          <span className="kpi-label">Pusiste en total</span>
          <strong className="kpi-value">{soles(total)}</strong>
          <span className="kpi-sub">
            {inPeriod.length} movimiento{inPeriod.length === 1 ? '' : 's'}
            {period === 'todo' && borrowed > 0
              ? ` · de esto ${soles(borrowed)} fueron prestados: tu dinero es ${soles(Math.max(total - borrowed, 0))}`
              : ''}
          </span>
        </div>
        {KINDS.map((k) => {
          const list = inPeriod.filter((r) => r.kind === k.key);
          return (
            <button
              key={k.key}
              type="button"
              className={`kpi-tile own-money-tile${kind === k.key ? ' is-active' : ''}`}
              aria-pressed={kind === k.key}
              onClick={() => setKind(kind === k.key ? 'all' : k.key)}
            >
              <span className="kpi-label">{k.label}</span>
              <strong className="kpi-value">{soles(totalOf(list))}</strong>
              <span className="kpi-sub">
                {list.length} · {k.hint}
              </span>
            </button>
          );
        })}
      </div>

      <div className="own-money-toolbar">
        <span className="hint">
          {kind === 'all' ? 'Todos los movimientos' : `Solo: ${KIND_LABEL[kind]}`} · toca una tarjeta para filtrar
        </span>
        {visible.length ? (
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            Descargar Excel (CSV)
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="hint">
          No hay movimientos en esta vista. Para registrar dinero tuyo usa{' '}
          <Link href="/admin/caja">Caja → Puse dinero</Link>.
        </p>
      ) : (
        <div className="pivot-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Detalle</th>
                <th scope="col" className="num">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td>{dateFmt.format(new Date(r.t))}</td>
                  <td>{KIND_LABEL[r.kind]}</td>
                  <th scope="row">{detailOf(r)}</th>
                  <td className="num">{soles(r.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3}>
                  Total
                </th>
                <td className="num">
                  <strong>{soles(totalOf(visible))}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
