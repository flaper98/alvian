'use client';

import { useMemo, useState, useTransition } from 'react';
import { applyPriceAction, savePricingAction, setPriceLockAction } from '@/lib/actions';
import { MAX_MARGIN_PERCENT, PRICE_ROUNDINGS, planPrices, priceMultiplier, suggestPrice } from '@/lib/pricing.mjs';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const percent = (value) => (value == null ? '—' : `${value.toLocaleString('es-PE')}%`);

const PRESETS = [30, 40, 50];
const FILTERS = [
  { key: 'subir', label: 'Por subir' },
  { key: 'ok', label: 'Ya cumplen' },
  { key: 'fijo', label: 'Precio fijo' },
  { key: 'sin-costo', label: 'Sin costo' },
  { key: 'all', label: 'Todos' },
];

const average = (list, pick) =>
  list.length ? Math.round(list.reduce((sum, item) => sum + pick(item), 0) / list.length) : null;

function costLabel(item) {
  if (item.costSource === 'compras') return 'Costo promedio de tus compras';
  if (item.costSource) return `Proveedor: ${item.costSource}`;
  return 'Sin compras ni precio de proveedor';
}

function PriceRow({ item, pending, onApply, onToggleLock }) {
  const diff = item.suggested == null ? null : item.suggested - item.price;
  return (
    <tr className={item.locked ? 'pricing-row-locked' : ''}>
      <th scope="row">
        {item.name}
        <span className="report-sub">
          {costLabel(item)}
          {item.hasImage ? '' : ' · sin foto (no se ve en la tienda)'}
        </span>
      </th>
      <td className="num">{item.cost == null ? '—' : soles(item.cost)}</td>
      <td className="num">
        {item.price > 0 ? soles(item.price) : 'Sin precio'}
        {item.marginNow != null ? <span className="report-sub">margen {percent(item.marginNow)}</span> : null}
      </td>
      <td className="num">
        {item.suggested == null ? '—' : <strong>{soles(item.suggested)}</strong>}
        {item.marginNew != null ? <span className="report-sub">margen {percent(item.marginNew)}</span> : null}
      </td>
      <td className="num">
        {item.status === 'subir' ? (
          <span className="text-good">
            +{soles(diff)}
            {item.price > 0 ? <span className="report-sub">+{Math.round((diff / item.price) * 100)}%</span> : null}
          </span>
        ) : item.status === 'ok' ? (
          'Ya cumple'
        ) : item.status === 'fijo' ? (
          'Precio fijo'
        ) : item.status === 'imposible' ? (
          'Margen imposible'
        ) : (
          'Registra una compra'
        )}
      </td>
      <td className="pricing-actions">
        {item.status === 'subir' ? (
          <button type="button" className="btn-secondary" disabled={pending} onClick={() => onApply(item)}>
            Subir
          </button>
        ) : null}
        <button
          type="button"
          className={`pricing-lock${item.locked ? ' is-locked' : ''}`}
          aria-pressed={item.locked}
          disabled={pending}
          onClick={() => onToggleLock(item)}
          title={
            item.locked
              ? 'Quitar el precio fijo: la automatización podrá subirlo'
              : 'Fijar este precio: la automatización no lo tocará'
          }
        >
          {item.locked ? '🔒 Fijo' : 'Fijar'}
        </button>
      </td>
    </tr>
  );
}

/**
 * Regla de precios (margen limpio %, redondeo, automático) con vista previa en
 * vivo de cada perfume. Lo que ves en la lista es exactamente lo que se aplica.
 */
export default function PricingBoard({ items, config, rates }) {
  const [margin, setMargin] = useState(String(config.marginPercent));
  const [rounding, setRounding] = useState(config.rounding);
  // Si todavía no guardaste tu regla, "automático" viene marcado.
  const [auto, setAuto] = useState(config.configured ? config.auto : true);
  const [filter, setFilter] = useState('subir');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [isPending, startTransition] = useTransition();

  const marginValue = Number(margin);
  const validMargin =
    margin.trim() !== '' && Number.isFinite(marginValue) && marginValue >= 0 && marginValue <= MAX_MARGIN_PERCENT;
  const ruleMargin = validMargin ? marginValue : config.marginPercent;

  const { plan, toRaise, counts, stats } = useMemo(() => {
    const planned = planPrices(items, { marginPercent: ruleMargin, rounding }, rates);
    const raise = planned.filter((p) => p.status === 'subir');
    const tally = { subir: 0, ok: 0, fijo: 0, 'sin-costo': 0, all: planned.length };
    for (const p of planned) tally[p.status === 'imposible' ? 'sin-costo' : p.status] += 1;
    const withPrice = raise.filter((p) => p.price > 0);
    return {
      plan: planned,
      toRaise: raise,
      counts: tally,
      stats: {
        raise: average(withPrice, (p) => ((p.suggested - p.price) / p.price) * 100),
        marginNow: average(withPrice, (p) => p.marginNow),
        marginNew: average(raise, (p) => p.marginNew),
        newOnes: raise.length - withPrice.length,
      },
    };
  }, [items, ruleMargin, rounding, rates]);

  const search = query.trim().toLowerCase();
  const visible = plan.filter(
    (p) =>
      (filter === 'all' || p.status === filter || (filter === 'sin-costo' && p.status === 'imposible')) &&
      (!search || p.name.toLowerCase().includes(search)),
  );

  const rule = { marginPercent: ruleMargin, rounding, ...rates };
  const multiplier = priceMultiplier(rule);
  const example = suggestPrice(100, rule);
  const exampleFees = example == null ? 0 : (example * (rates.commissionPercent + rates.taxPercent)) / 100;

  function save(withPrices) {
    if (!validMargin) {
      setMessage({ tone: 'bad', text: `Pon un margen entre 0% y ${MAX_MARGIN_PERCENT}%.` });
      return;
    }
    if (
      withPrices &&
      !window.confirm(
        `¿Subir el precio de ${toRaise.length} perfume${toRaise.length === 1 ? '' : 's'}? Los clientes verán los precios nuevos en la tienda al instante.`,
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await savePricingAction({
        marginPercent: ruleMargin,
        rounding,
        auto,
        prices: withPrices ? toRaise.map((p) => ({ id: p.id, price: p.suggested })) : [],
      });
      if (result?.error) setMessage({ tone: 'bad', text: result.error });
      else
        setMessage({
          tone: 'good',
          text: withPrices
            ? `Listo: subiste ${result.applied} precio${result.applied === 1 ? '' : 's'} y tu regla quedó guardada.`
            : `Regla guardada${auto ? ': desde ahora los precios se ajustan solos' : ''}.`,
        });
    });
  }

  function applyOne(item) {
    setMessage(null);
    startTransition(async () => {
      const result = await applyPriceAction(item.id, item.suggested);
      setMessage(
        result?.error
          ? { tone: 'bad', text: result.error }
          : { tone: 'good', text: `${item.name}: ahora a ${soles(item.suggested)}.` },
      );
    });
  }

  function toggleLock(item) {
    setMessage(null);
    startTransition(async () => {
      const result = await setPriceLockAction(item.id, !item.locked);
      if (result?.error) setMessage({ tone: 'bad', text: result.error });
    });
  }

  return (
    <>
      <div className="chart-card pricing-rule">
        <h3 className="chart-title">Tu regla de precios</h3>
        <div className="pricing-rule-row">
          <label className="pricing-field">
            <span>Margen limpio que quieres ganar</span>
            <span className="pricing-margin-input">
              <input
                type="number"
                min="0"
                max={MAX_MARGIN_PERCENT}
                step="1"
                inputMode="decimal"
                value={margin}
                onChange={(event) => setMargin(event.target.value)}
                aria-describedby="pricing-example"
              />
              <span aria-hidden="true">%</span>
            </span>
          </label>
          <div className="filter-chips pricing-presets" role="group" aria-label="Márgenes rápidos">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                className={`filter-chip${ruleMargin === value ? ' active' : ''}`}
                aria-pressed={ruleMargin === value}
                onClick={() => setMargin(String(value))}
              >
                {value}%
              </button>
            ))}
          </div>
          <label className="pricing-field">
            <span>Redondeo (siempre hacia arriba)</span>
            <select value={rounding} onChange={(event) => setRounding(event.target.value)}>
              {Object.entries(PRICE_ROUNDINGS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="pricing-example" id="pricing-example">
          {!validMargin ? (
            `Pon un margen entre 0% y ${MAX_MARGIN_PERCENT}%.`
          ) : multiplier == null || example == null ? (
            'Con la comisión de la vendedora no se puede llegar a ese margen: bájalo.'
          ) : (
            <>
              Vendes a <strong>{multiplier.toLocaleString('es-PE', { maximumFractionDigits: 2 })} veces el costo</strong>.
              Ej.: un perfume que te cuesta S/ 100 se vende a <strong>{soles(example)}</strong> y te quedan{' '}
              <strong>{soles(example - 100 - exampleFees)}</strong> limpios, ya sin la comisión
              {rates.taxPercent > 0 ? ' y el impuesto' : ''} ({soles(exampleFees)}).
            </>
          )}
        </p>

        <label className="pricing-auto">
          <input type="checkbox" checked={auto} onChange={(event) => setAuto(event.target.checked)} />
          <span>
            <strong>Automático:</strong> cuando registras una compra, recibes un encargo o cambia el precio de tu
            proveedor, el precio de venta sube solo si quedó por debajo de tu margen. Nunca baja un precio solo ni
            toca los de precio fijo.
          </span>
        </label>

        <div className="pricing-buttons">
          <button
            type="button"
            className="btn-primary"
            disabled={isPending || !validMargin || toRaise.length === 0}
            onClick={() => save(true)}
          >
            {isPending ? 'Guardando…' : `Guardar y subir ${toRaise.length} precio${toRaise.length === 1 ? '' : 's'}`}
          </button>
          <button type="button" className="btn-secondary" disabled={isPending || !validMargin} onClick={() => save(false)}>
            Solo guardar la regla
          </button>
        </div>
        {message ? (
          <p className={message.tone === 'bad' ? 'form-error' : 'pricing-message-ok'} role="status">
            {message.text}
          </p>
        ) : null}
      </div>

      <p className="pricing-summary">
        {toRaise.length === 0 ? (
          'Todos tus precios con costo conocido ya cumplen este margen. 👌'
        ) : (
          <>
            <strong>{toRaise.length}</strong> perfume{toRaise.length === 1 ? '' : 's'} por debajo de tu margen
            {stats.raise != null ? (
              <>
                : subirían en promedio <strong>+{stats.raise}%</strong> y su margen pasaría de{' '}
                <strong>{stats.marginNow}%</strong> a <strong>{stats.marginNew}%</strong>
              </>
            ) : null}
            {stats.newOnes > 0 ? ` (${stats.newOnes} todavía sin precio)` : ''}.
          </>
        )}
      </p>

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
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p className="hint">No hay perfumes en esta vista.</p>
      ) : (
        <div className="pivot-scroll">
          <table className="report-table pricing-table">
            <thead>
              <tr>
                <th scope="col">Perfume</th>
                <th scope="col" className="num">
                  Costo
                </th>
                <th scope="col" className="num">
                  Precio hoy
                </th>
                <th scope="col" className="num">
                  Con tu margen
                </th>
                <th scope="col" className="num">
                  Cambio
                </th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <PriceRow key={item.id} item={item} pending={isPending} onApply={applyOne} onToggleLock={toggleLock} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
