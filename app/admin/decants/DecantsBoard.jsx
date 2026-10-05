'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  openBottleAction,
  saveDecantConfigAction,
  setDecantMlAction,
  updateDecantSettingsAction,
} from '@/lib/actions';
import { MAX_MARGIN_PERCENT } from '@/lib/pricing.mjs';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const ml = (value) => `${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 1 })} ml`;

const FILTERS = [
  { key: 'tienda', label: 'En la tienda' },
  { key: 'abiertos', label: 'Con ml abiertos' },
  { key: 'all', label: 'Todos' },
];

/** Tamaños, costo del envase y margen de los decants. */
function DecantConfig({ config }) {
  const [sizes, setSizes] = useState(config.sizes.map((s) => ({ ml: String(s.ml), packaging: String(s.packaging) })));
  const [margin, setMargin] = useState(String(config.marginPercent));
  const [message, setMessage] = useState(null);
  const [isPending, startTransition] = useTransition();

  const setSize = (index, key, value) =>
    setSizes((current) => current.map((s, i) => (i === index ? { ...s, [key]: value } : s)));

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveDecantConfigAction({
        sizes: sizes.filter((s) => s.ml !== '').map((s) => ({ ml: Number(s.ml), packaging: Number(s.packaging || 0) })),
        marginPercent: Number(margin),
      });
      setMessage(result?.error ? { tone: 'bad', text: result.error } : { tone: 'good', text: 'Guardado: los precios se actualizaron.' });
    });
  }

  return (
    <div className="chart-card decant-config">
      <h3 className="chart-title">Tamaños y precios</h3>
      <div className="decant-sizes">
        {sizes.map((s, index) => (
          <div className="decant-size" key={index}>
            <label>
              <span>Tamaño (ml)</span>
              <input type="number" min="1" max="100" step="1" value={s.ml} onChange={(e) => setSize(index, 'ml', e.target.value)} />
            </label>
            <label>
              <span>Envase + etiqueta (S/)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={s.packaging}
                onChange={(e) => setSize(index, 'packaging', e.target.value)}
              />
            </label>
            <button
              type="button"
              className="pricing-lock"
              aria-label={`Quitar el tamaño de ${s.ml} ml`}
              onClick={() => setSizes((current) => current.filter((_, i) => i !== index))}
              disabled={sizes.length <= 1}
            >
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setSizes((c) => [...c, { ml: '', packaging: '' }])}>
          + Tamaño
        </button>
      </div>
      <label className="pricing-field">
        <span>Margen limpio de los decants</span>
        <span className="pricing-margin-input">
          <input
            type="number"
            min="0"
            max={MAX_MARGIN_PERCENT}
            step="1"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
          />
          <span aria-hidden="true">%</span>
        </span>
      </label>
      <p className="hint">
        Precio de cada decant = (ml × costo por ml + envase) con este margen, ya descontando la comisión de la vendedora
        y redondeado como en tu regla de precios.
      </p>
      <div className="pricing-buttons">
        <button type="button" className="btn-primary" disabled={isPending} onClick={save}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {message ? (
        <p className={message.tone === 'bad' ? 'form-error' : 'pricing-message-ok'} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function DecantRow({ item, pending, run }) {
  const [volume, setVolume] = useState(String(item.volumeMl));

  function saveVolume() {
    if (Number(volume) === item.volumeMl) return;
    run(() => updateDecantSettingsAction(item.id, { volumeMl: Number(volume), enabled: item.enabled }));
  }

  return (
    <tr>
      <th scope="row">
        {item.name}
        <span className="report-sub">
          {item.costSource === 'compras'
            ? `Frasco: ${soles(item.bottleCost)} (promedio de compras)`
            : item.costSource
              ? `Frasco: ${soles(item.bottleCost)} (proveedor)`
              : 'Sin costo: registra una compra'}
        </span>
      </th>
      <td className="num">
        <input
          className="decant-volume"
          type="number"
          min="1"
          max="1000"
          step="1"
          value={volume}
          aria-label={`ml del frasco de ${item.name}`}
          onChange={(e) => setVolume(e.target.value)}
          onBlur={saveVolume}
        />
      </td>
      <td className="num">{item.stock}</td>
      <td className="num">
        <strong>{ml(item.poolMl)}</strong>
        <button
          type="button"
          className="pricing-lock"
          disabled={pending}
          onClick={() => {
            const answer = window.prompt(`¿Cuántos ml quedan de ${item.name} para decants?`, String(item.poolMl));
            if (answer == null) return;
            run(() => setDecantMlAction(item.id, Number(String(answer).replace(',', '.'))));
          }}
        >
          Ajustar
        </button>
      </td>
      <td className="num">{item.perMl == null ? '—' : `S/ ${item.perMl.toFixed(2)}`}</td>
      <td className="num decant-prices">
        {item.sizes.map((s) => (
          <span key={s.ml}>
            {s.ml} ml: <strong>{s.price == null ? '—' : soles(s.price)}</strong>
          </span>
        ))}
      </td>
      <td>
        <label className="decant-toggle">
          <input
            type="checkbox"
            checked={item.enabled}
            disabled={pending || (!item.enabled && item.perMl == null)}
            onChange={(e) => run(() => updateDecantSettingsAction(item.id, { volumeMl: item.volumeMl, enabled: e.target.checked }))}
          />
          <span>{item.enabled ? 'Sí' : 'No'}</span>
        </label>
      </td>
      <td className="pricing-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={pending || item.stock < 1 || item.bottleCost == null}
          title={item.stock < 1 ? 'No hay frascos en stock' : 'Saca 1 frasco del stock para llenar decants'}
          onClick={() => {
            if (window.confirm(`¿Abrir un frasco de ${item.name} (${item.volumeMl} ml) para decants? Sale 1 del stock.`)) {
              run(() => openBottleAction(item.id));
            }
          }}
        >
          Abrir frasco
        </button>
      </td>
    </tr>
  );
}

export default function DecantsBoard({ catalog }) {
  const [filter, setFilter] = useState(catalog.items.some((i) => i.enabled) ? 'tienda' : 'all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      tienda: catalog.items.filter((i) => i.enabled).length,
      abiertos: catalog.items.filter((i) => i.poolMl > 0).length,
      all: catalog.items.length,
    }),
    [catalog.items],
  );
  const search = query.trim().toLowerCase();
  const visible = catalog.items.filter(
    (i) =>
      (filter === 'all' || (filter === 'tienda' ? i.enabled : i.poolMl > 0)) &&
      (!search || i.name.toLowerCase().includes(search)),
  );

  function run(action) {
    setError('');
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <DecantConfig config={catalog.config} />

      <div className="pricing-toolbar">
        <div className="filter-chips" role="group" aria-label="Filtrar perfumes">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip${filter === f.key ? ' active' : ''}`}
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="filter-chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="pricing-search"
          placeholder="Buscar perfume…"
          aria-label="Buscar perfume"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}

      {visible.length === 0 ? (
        <p className="hint">
          No hay perfumes en esta vista. {filter === 'tienda' ? 'Mira «Todos» y activa «Vender en tienda».' : ''}
        </p>
      ) : (
        <div className="pivot-scroll">
          <table className="report-table pricing-table">
            <thead>
              <tr>
                <th scope="col">Perfume</th>
                <th scope="col" className="num">Frasco (ml)</th>
                <th scope="col" className="num">Frascos</th>
                <th scope="col" className="num">ml para decants</th>
                <th scope="col" className="num">Costo por ml</th>
                <th scope="col" className="num">Precios</th>
                <th scope="col">Vender en tienda</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <DecantRow key={item.id} item={item} pending={isPending} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
