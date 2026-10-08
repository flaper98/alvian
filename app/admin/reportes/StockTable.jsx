'use client';

import { useMemo, useState } from 'react';

// Montos redondos (sin céntimos) para que las tarjetas se lean de un vistazo.
const soles = (value) => `S/ ${Math.round(Number(value) || 0).toLocaleString('es-PE')}`;

// Estado de cada perfume (lib/reports.js → getInventoryReport).
const STATUSES = {
  vende: { label: 'Se vende', plural: 'Se venden', tip: 'Vendido en los últimos 30 días' },
  nuevo: { label: 'Nuevo', plural: 'Nuevos', tip: 'Llegó hace 30 días o menos' },
  lento: { label: 'Lento', plural: 'Lentos', tip: 'De 31 a 60 días sin moverse' },
  parado: { label: 'Parado', plural: 'Parados', tip: 'Más de 60 días sin venderse: haz una promo' },
};

function since(days) {
  if (days == null) return '';
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `${days} días`;
}

/** Texto corto junto al estado: cuándo se vendió o desde cuándo está quieto. */
function statusNote(item) {
  if (item.status === 'vende') return item.saleDays === 0 ? 'hoy' : `hace ${since(item.saleDays)}`;
  if (item.status === 'nuevo') return `llegó hace ${since(item.arrivedDays)}`;
  return item.idleDays != null ? `${since(item.idleDays)} quieto` : '';
}

function StockCard({ item }) {
  return (
    <li className={`stock-card stock-${item.status}`}>
      <div className="stock-card-top">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" width={44} height={44} loading="lazy" />
        ) : (
          <span className="stock-noimg" aria-hidden="true" />
        )}
        <div className="stock-card-title">
          <strong>{item.name}</strong>
          <span className="stock-status" title={STATUSES[item.status].tip}>
            <span className="stock-dot" aria-hidden="true" />
            {STATUSES[item.status].label}
            {statusNote(item) ? <span className="stock-status-note"> · {statusNote(item)}</span> : null}
          </span>
        </div>
      </div>
      <div className="stock-card-stats">
        <div>
          <strong>{item.stock}</strong>
          <span>{item.stock === 1 ? 'frasco' : 'frascos'}</span>
        </div>
        <div>
          <strong>{item.invested == null ? '—' : soles(item.invested)}</strong>
          <span>invertido</span>
        </div>
        <div>
          <strong className={item.profit != null && item.profit < 0 ? 'text-critical' : 'text-good'}>
            {item.profit == null ? '—' : `+${soles(item.profit)}`}
          </strong>
          <span>ganarías</span>
        </div>
      </div>
      <div className="stock-card-foot">
        <span>Compra {item.unitCost == null ? '—' : soles(item.unitCost)}</span>
        <span>Venta {item.price > 0 ? soles(item.price) : '—'}</span>
      </div>
    </li>
  );
}

/** Tu stock hoy: botones por estado (filtran) y una tarjeta por perfume. */
export default function StockTable({ items }) {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c = {};
    for (const key of Object.keys(STATUSES)) c[key] = items.filter((i) => i.status === key).length;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = items.filter(
      (i) => (status === 'all' || i.status === status) && (!term || i.name.toLowerCase().includes(term)),
    );
    // Parados y lentos: primero los que llevan más tiempo quietos.
    return status === 'parado' || status === 'lento'
      ? [...list].sort((a, b) => (b.idleDays ?? 0) - (a.idleDays ?? 0))
      : list;
  }, [items, status, query]);

  if (items.length === 0) {
    return <p className="hint">No tienes perfumes en stock.</p>;
  }

  const invested = visible.reduce((sum, i) => sum + (Number(i.invested) || 0), 0);

  return (
    <div className="stock-board">
      <div className="stock-pills" role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          className={`stock-pill stock-pill-all${status === 'all' ? ' is-on' : ''}`}
          aria-pressed={status === 'all'}
          onClick={() => setStatus('all')}
        >
          <strong>{items.length}</strong>
          <span>Todos</span>
        </button>
        {/* Solo los estados que tienen perfumes: un botón en cero no dice nada. */}
        {Object.entries(STATUSES).map(([key, s]) =>
          counts[key] > 0 || status === key ? (
            <button
              key={key}
              type="button"
              className={`stock-pill stock-${key}${status === key ? ' is-on' : ''}`}
              aria-pressed={status === key}
              title={s.tip}
              onClick={() => setStatus(key)}
            >
              <strong>{counts[key]}</strong>
              <span>{s.plural}</span>
            </button>
          ) : null,
        )}
      </div>

      <div className="stock-board-bar">
        <span className="stock-board-total">
          {visible.length} perfume{visible.length === 1 ? '' : 's'} · {soles(invested)} invertido
        </span>
        <input
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar perfume"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="hint">Nada por aquí.</p>
      ) : (
        <ul className="stock-grid">
          {visible.map((item) => (
            <StockCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
