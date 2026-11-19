'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  cancelBoutiqueSaleAction,
  deleteBoutiqueMoveAction,
  deliverToBoutiqueAction,
  recordBoutiqueSaleAction,
  returnFromBoutiqueAction,
  saveBoutiqueConfigAction,
  settleBoutiqueSalesAction,
  updateBoutiqueDeliveryAction,
} from '@/lib/actions';
import {
  boutiquePrice,
  boutiqueSplit,
  breakEvenMarkup,
  compactDay,
  deliveryLines,
  deliverySheet,
  limaDay,
  nextBoutiqueCode,
  sedeProductCode,
} from '@/lib/boutique.mjs';

const soles = (value) =>
  value == null
    ? '—'
    : `${Number(value) < 0 ? '−' : ''}S/ ${Math.abs(Number(value)).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
const pct = (value) => (value == null ? '—' : `${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 1 })}%`);
const dayFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' });
const todayLima = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);

function SubmitButton({ children, className = 'btn-primary' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? 'Guardando...' : children}
    </button>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div className={`kpi-tile${tone ? ` kpi-tile-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  );
}

// ---------- Simulador de precios ----------

/** Precio en la boutique de cada perfume (tu precio web + el aumento) y lo que te queda. */
export function PriceSimulator({ catalog, config, rates, rounding }) {
  const [fee, setFee] = useState(String(config.feePercent));
  const [markup, setMarkup] = useState(String(config.markupPercent));
  const [query, setQuery] = useState('');
  const [onlyStock, setOnlyStock] = useState(false);
  const [state, formAction] = useActionState(saveBoutiqueConfigAction, { error: null });

  const feePercent = Number(fee) || 0;
  const markupPercent = Number(markup) || 0;
  const valid = feePercent >= 0 && feePercent <= 90 && markupPercent >= 0 && markupPercent <= 200;
  const evenMarkup = breakEvenMarkup(feePercent);
  // De cada S/ 100 de tu precio web, cuánto te paga la boutique (sin contar el redondeo).
  const paysPerHundred = Math.round((1 + markupPercent / 100) * (1 - feePercent / 100) * 10000) / 100;

  const rows = useMemo(() => {
    const words = query.trim().toLowerCase();
    return catalog
      .filter((item) => item.price > 0)
      .filter((item) => !words || item.name.toLowerCase().includes(words))
      .filter((item) => !onlyStock || item.stock > 0)
      .map((item) => {
        const shop = valid ? boutiquePrice(item.price, { markupPercent, rounding }) : null;
        const split = shop == null ? null : boutiqueSplit(shop, item.cost, { feePercent, taxPercent: rates.taxPercent });
        // Lo que te paga la boutique frente a lo que cobras en la web por el mismo perfume.
        const vsWeb = split ? Math.round((split.youGet - item.price) * 100) / 100 : null;
        return { ...item, shop, split, vsWeb };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog, query, onlyStock, valid, feePercent, markupPercent, rounding, rates.taxPercent]);

  const withoutCost = rows.filter((row) => row.cost == null).length;

  return (
    <>
      <form action={formAction} className="chart-card boutique-sim-form">
        <input type="hidden" name="name" value={config.name} />
        <div className="boutique-sim-inputs">
          <label>
            Comisión de la boutique (%)
            <input name="feePercent" type="number" min="0" max="90" step="0.5" value={fee} onChange={(e) => setFee(e.target.value)} />
          </label>
          <label>
            Aumento sobre tu precio web (%)
            <input name="markupPercent" type="number" min="0" max="200" step="0.5" value={markup} onChange={(e) => setMarkup(e.target.value)} />
          </label>
          <div className="boutique-sim-actions">
            <SubmitButton className="btn-secondary">Guardar estos %</SubmitButton>
          </div>
        </div>
        {valid ? (
          <p className="hint">
            <strong>Precio en la boutique</strong> = tu precio web + {markupPercent}%, redondeado hacia arriba como tus
            precios. La boutique se queda el {feePercent}% de ese precio: de cada S/ 100 de tu precio web te paga unos{' '}
            <strong>S/ {paysPerHundred.toLocaleString('es-PE', { maximumFractionDigits: 2 })}</strong>.
            {evenMarkup != null && markupPercent < evenMarkup
              ? ` Para que te pague lo mismo que cobras en la web, el aumento tendría que ser ${evenMarkup.toLocaleString('es-PE')}%.`
              : ''}
          </p>
        ) : (
          <p className="form-error">La comisión va de 0% a 90% y el aumento de 0% a 200%.</p>
        )}
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        {state?.success ? <p className="form-ok">Guardado: se usarán al dejar perfumes en la boutique.</p> : null}
      </form>

      <div className="report-filters boutique-sim-filters">
        <input
          type="search"
          placeholder="Buscar perfume…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar perfume"
        />
        <label className="boutique-check">
          <input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Solo con stock
        </label>
      </div>

      <div className="pivot-scroll">
        <table className="report-table boutique-sim-table">
          <thead>
            <tr>
              <th scope="col">Perfume</th>
              <th scope="col" className="num">Costo</th>
              <th scope="col" className="num">Web</th>
              <th scope="col" className="num">Boutique (+{markupPercent}%)</th>
              <th scope="col" className="num">Se queda la boutique ({feePercent}%)</th>
              <th scope="col" className="num">Te paga</th>
              <th scope="col" className="num">Frente a la web</th>
              <th scope="col" className="num">Ganas por perfume</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">
                  {row.name}
                  <span className="boutique-sub">
                    {row.stock > 0 ? `${row.stock} en stock` : 'Sin stock'}
                    {row.costSource && row.costSource !== 'compras' ? ` · costo de ${row.costSource}` : ''}
                  </span>
                </th>
                <td className="num">{soles(row.cost)}</td>
                <td className="num">{soles(row.price)}</td>
                <td className="num">
                  <strong>{soles(row.shop)}</strong>
                </td>
                <td className="num">{soles(row.split?.fee)}</td>
                <td className="num">{soles(row.split?.youGet)}</td>
                <td className="num">
                  {row.vsWeb == null ? (
                    '—'
                  ) : (
                    <span className={row.vsWeb < 0 ? 'text-critical' : 'text-good'}>
                      {row.vsWeb > 0 ? '+' : ''}
                      {soles(row.vsWeb)}
                    </span>
                  )}
                </td>
                <td className="num">
                  <strong className="text-good">{soles(row.split?.profit)}</strong>
                  {row.split?.margin != null ? <span className="boutique-sub">{pct(row.split.margin)} del precio</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="hint">No hay perfumes con precio que coincidan.</p> : null}
      <p className="hint">
        «Frente a la web»: lo que te paga la boutique menos lo que cobras en tu web por ese perfume (en verde si recibes
        más).
        {withoutCost > 0
          ? ` ${withoutCost} perfume${withoutCost === 1 ? '' : 's'} sin costo registrado muestra${withoutCost === 1 ? '' : 'n'} «—» en «Ganas».`
          : ''}
      </p>
    </>
  );
}

// ---------- Control de la boutique ----------

function ConfigForm({ config }) {
  const [state, formAction] = useActionState(saveBoutiqueConfigAction, { error: null });
  return (
    <details className="chart-card boutique-config">
      <summary>
        Datos de la boutique · {config.sedes.join(' y ')} · comisión {config.feePercent}% · precio web +
        {config.markupPercent}%
      </summary>
      <form action={formAction} className="boutique-form-grid">
        <label>
          Nombre
          <input name="name" required maxLength={60} defaultValue={config.name} />
        </label>
        <label>
          Comisión (%)
          <input name="feePercent" type="number" min="0" max="90" step="0.5" defaultValue={config.feePercent} />
        </label>
        <label>
          Aumento sobre tu precio web (%)
          <input name="markupPercent" type="number" min="0" max="200" step="0.5" defaultValue={config.markupPercent} />
        </label>
        {config.sedes.map((name, index) => (
          <label key={index}>
            Sede {index + 1}
            <input name="sedes" required maxLength={40} defaultValue={name} />
          </label>
        ))}
        <div className="boutique-form-actions">
          <SubmitButton>Guardar</SubmitButton>
        </div>
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        {state?.success ? <p className="form-ok">Guardado.</p> : null}
      </form>
      <p className="hint">
        La comisión nueva se aplica a las ventas que registres desde ahora. Puedes cambiar el nombre de cada sede: lo
        que ya dejaste en ella no se pierde.
      </p>
    </details>
  );
}

function DeliverForm({ catalog, config, taxPercent, rounding }) {
  const [state, formAction] = useActionState(deliverToBoutiqueAction, { error: null });
  const available = useMemo(
    () => catalog.filter((item) => item.stock > 0).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [catalog],
  );
  const [perfumeId, setPerfumeId] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  // La sede se queda elegida: así puedes dejar varios perfumes seguidos en la misma.
  const [sede, setSede] = useState('1');
  const perfume = available.find((item) => String(item.id) === perfumeId) || null;
  const newCode = useMemo(() => nextBoutiqueCode(catalog.map((item) => item.code)), [catalog]);
  // Precio sugerido: tu precio web + el aumento de la boutique.
  const suggested = perfume ? boutiquePrice(perfume.price, { markupPercent: config.markupPercent, rounding }) : null;
  const split = perfume && Number(price) > 0 ? boutiqueSplit(Number(price), perfume.cost, { feePercent: config.feePercent, taxPercent }) : null;

  useEffect(() => {
    if (!state?.success) return;
    setPerfumeId('');
    setPrice('');
    setQuantity('1');
  }, [state]);

  return (
    <form action={formAction} className="chart-card">
      <h3 className="chart-title">Dejar perfumes en la boutique</h3>
      <div className="boutique-form-grid">
        <label>
          Sede
          <select name="sede" required value={sede} onChange={(e) => setSede(e.target.value)}>
            {config.sedes.map((name, index) => (
              <option key={index} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Perfume
          <select
            name="perfumeId"
            required
            value={perfumeId}
            onChange={(e) => {
              setPerfumeId(e.target.value);
              const next = available.find((item) => String(item.id) === e.target.value);
              const value = next ? boutiquePrice(next.price, { markupPercent: config.markupPercent, rounding }) : null;
              setPrice(value == null ? '' : String(value));
            }}
          >
            <option value="">Elige un perfume…</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code ? `${sedeProductCode(item.code, config, sede)} · ` : ''}
                {item.name} ({item.stock} en stock)
              </option>
            ))}
          </select>
          {perfume ? (
            <span className="hint">
              {perfume.code
                ? `Código ${sedeProductCode(perfume.code, config, sede)}`
                : `Es la primera vez que lo dejas: tendrá el código ${sedeProductCode(newCode, config, sede)}`}
            </span>
          ) : null}
        </label>
        <label>
          Cantidad
          <input name="quantity" type="number" min="1" max={perfume?.stock || undefined} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label>
          Precio en la boutique (S/)
          <input name="unitPrice" type="number" min="1" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} />
          {suggested != null ? (
            <span className="hint">
              Sugerido {soles(suggested)}: tu web {soles(perfume.price)} + {config.markupPercent}%
            </span>
          ) : perfume ? (
            <span className="hint">Sin precio en la web: pon el precio a mano.</span>
          ) : null}
        </label>
      </div>
      {split ? (
        <p className="hint boutique-preview">
          Por cada uno: la boutique se queda {soles(split.fee)}, te paga <strong>{soles(split.youGet)}</strong> y ganas{' '}
          <strong className={split.profit < 0 ? 'text-critical' : 'text-good'}>{soles(split.profit)}</strong> ({pct(split.margin)}).
        </p>
      ) : null}
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? (
        <p className="form-ok">
          Listo: {sedeProductCode(state.code, config, state.sede)} quedó en {config.sedes[state.sede - 1] || 'la boutique'} y
          se descontó de tu stock de la web.
        </p>
      ) : null}
      <div className="boutique-form-actions">
        <SubmitButton>Dejar en {config.sedes[Number(sede) - 1] || 'la boutique'}</SubmitButton>
      </div>
    </form>
  );
}

/** Formulario corto de una fila: "Vendió" o "Devolver". */
function RowForm({ row, mode, onDone }) {
  const action = mode === 'venta' ? recordBoutiqueSaleAction : returnFromBoutiqueAction;
  const [state, formAction] = useActionState(action, { error: null });
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="boutique-row-form">
      <input type="hidden" name="perfumeId" value={row.perfumeId} />
      <input type="hidden" name="sede" value={row.sede} />
      <label>
        Cantidad
        <input name="quantity" type="number" min="1" max={row.atBoutique} defaultValue="1" required />
      </label>
      {mode === 'venta' ? (
        <>
          <label>
            Precio (S/)
            <input name="unitPrice" type="number" min="1" step="0.01" defaultValue={row.price ?? ''} required />
          </label>
          <label>
            Fecha
            <input name="date" type="date" defaultValue={todayLima()} max={todayLima()} />
          </label>
        </>
      ) : null}
      <SubmitButton>{mode === 'venta' ? 'Registrar venta' : 'Devolver a mi stock'}</SubmitButton>
      <button type="button" className="btn-secondary" onClick={onDone}>
        Cancelar
      </button>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

/** Corregir una entrega: sede, cantidad, precio y fecha. Tu stock y el de la sede se ajustan solos. */
function EditDeliveryForm({ delivery, config, note, onDone }) {
  const [state, formAction] = useActionState(updateBoutiqueDeliveryAction.bind(null, delivery.id), { error: null });
  const date = limaDay(delivery.occurredAt);
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="boutique-row-form">
      {note ? <p className="hint boutique-row-note">{note}</p> : null}
      <label>
        Sede
        <select name="sede" defaultValue={delivery.sede}>
          {config.sedes.map((name, index) => (
            <option key={index} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input name="quantity" type="number" min="1" defaultValue={delivery.quantity} required />
      </label>
      <label>
        Precio (S/)
        <input name="unitPrice" type="number" min="1" step="0.01" defaultValue={delivery.unitPrice ?? ''} required />
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={date} max={todayLima()} required />
      </label>
      <input type="hidden" name="originalDate" value={date} />
      <SubmitButton>Guardar cambios</SubmitButton>
      <button type="button" className="btn-secondary" onClick={onDone}>
        Cancelar
      </button>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

/** Lo que queda en cada sede, separado por sede, con su código y las acciones. */
function StockTable({ stock, sedes, config }) {
  const [open, setOpen] = useState(null);
  const rows = stock.filter((row) => row.atBoutique > 0);
  if (!rows.length) return <p className="hint">Todavía no tienes perfumes en la boutique.</p>;
  return (
    <div className="pivot-scroll">
      <table className="report-table boutique-stock-table">
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Perfume</th>
            <th scope="col" className="num">Quedan</th>
            <th scope="col" className="num">Vendidos</th>
            <th scope="col" className="num">Precio</th>
            <th scope="col" />
          </tr>
        </thead>
        {sedes.map((sede) => {
          const sedeRows = rows.filter((row) => row.sede === sede.id);
          if (!sedeRows.length) return null;
          return (
            <tbody key={sede.id}>
              <tr className="boutique-sede-row">
                <th scope="colgroup" colSpan={6}>
                  {sede.name} · {sede.units} perfume{sede.units === 1 ? '' : 's'} · {soles(sede.value)}
                </th>
              </tr>
              {sedeRows.map((row) => {
                const key = (mode) => `${row.sede}-${row.perfumeId}-${mode}`;
                return (
                  <tr key={`${row.sede}-${row.perfumeId}`}>
                    <td className="boutique-code">{row.code || '—'}</td>
                    <th scope="row">
                      {row.name}
                      {open === key('venta') || open === key('devolucion') ? (
                        <RowForm row={row} mode={open.endsWith('venta') ? 'venta' : 'devolucion'} onDone={() => setOpen(null)} />
                      ) : null}
                      {open === key('editar') && row.lastDelivery ? (
                        <EditDeliveryForm
                          delivery={row.lastDelivery}
                          config={config}
                          note={
                            row.deliveryCount > 1
                              ? `Editas la última entrega (${dayFmt.format(new Date(row.lastDelivery.occurredAt))} · ${row.lastDelivery.quantity} u.). Las otras ${row.deliveryCount - 1}, en «Movimientos».`
                              : null
                          }
                          onDone={() => setOpen(null)}
                        />
                      ) : null}
                    </th>
                    <td className="num">
                      <strong>{row.atBoutique}</strong>
                    </td>
                    <td className="num">{row.sold}</td>
                    <td className="num">{soles(row.price)}</td>
                    <td className="boutique-row-actions">
                      <button type="button" className="btn-primary" onClick={() => setOpen(key('venta'))}>
                        Vendió
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setOpen(key('devolucion'))}>
                        Devolver
                      </button>
                      {row.lastDelivery ? (
                        <button type="button" className="btn-secondary" onClick={() => setOpen(key('editar'))}>
                          Editar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/**
 * Excel de entrega para la boutique: lo que dejaste en una sede entre dos días,
 * con el formato de sus guías (FECHA, CODIGO, DESCRIPCION, CANTIDAD, PRECIO).
 */
function DeliveryExcel({ deliveries, config }) {
  const today = limaDay(new Date());
  const [sede, setSede] = useState('1');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [error, setError] = useState(null);
  const [saving, startSaving] = useTransition();
  const lines = useMemo(() => deliveryLines(deliveries, { sede, from, to }), [deliveries, sede, from, to]);
  const sedeLabel = config.sedes[Number(sede) - 1] || 'Sede';
  // Como las guías de la boutique (MANDI14102026.xlsx): ALVIAN_<sede>_<día>.xlsx
  const fileName = `ALVIAN_${sedeLabel.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '')}_${compactDay(to || today)}.xlsx`;
  const units = lines.reduce((total, line) => total + line.quantity, 0);

  function download() {
    setError(null);
    startSaving(async () => {
      try {
        // La librería se carga solo al descargar: no pesa en el resto del panel.
        const { default: writeExcelFile } = await import('write-excel-file/browser');
        const { data, columns } = deliverySheet(lines);
        await writeExcelFile(data, { sheet: 'Entrega', columns }, { fontFamily: 'Times New Roman', fontSize: 11 }).toFile(fileName);
      } catch (err) {
        setError(`No se pudo crear el Excel: ${err.message}`);
      }
    });
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Excel de entrega para la boutique</h3>
      <p className="hint">
        Elige la sede y los días: sale lo que dejaste en esa sede, con el código de cada perfume y su sede (ALV001-AMA…), la cantidad y
        el precio, igual que las guías que recibe la boutique.
      </p>
      <div className="boutique-form-grid">
        <label>
          Sede
          <select value={sede} onChange={(e) => setSede(e.target.value)}>
            {config.sedes.map((name, index) => (
              <option key={index} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      {lines.length ? (
        <div className="pivot-scroll">
          <table className="report-table boutique-excel-table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Código</th>
                <th scope="col">Descripción</th>
                <th scope="col" className="num">Cantidad</th>
                <th scope="col" className="num">Precio</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={`${line.day}-${line.code}-${line.unitPrice}`}>
                  <td>{line.day.split('-').reverse().join('/')}</td>
                  <td className="boutique-code">{line.code}</td>
                  <th scope="row">{line.name.toUpperCase()}</th>
                  <td className="num">{line.quantity}</td>
                  <td className="num">{soles(line.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="hint">No dejaste perfumes en {sedeLabel} en esos días.</p>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="boutique-form-actions">
        <button type="button" className="btn-primary" disabled={!lines.length || saving} onClick={download}>
          {saving ? 'Creando…' : `Descargar Excel · ${units} perfume${units === 1 ? '' : 's'}`}
        </button>
        {lines.length ? <span className="hint">{fileName}</span> : null}
      </div>
    </div>
  );
}

function PendingPayments({ pending }) {
  const [selected, setSelected] = useState(() => new Set(pending.map((s) => s.id)));
  const [result, setResult] = useState(null);
  const [saving, startSaving] = useTransition();
  useEffect(() => setSelected(new Set(pending.map((s) => s.id))), [pending]);

  if (!pending.length) {
    return (
      <>
        {result?.cash != null ? (
          <p className="form-ok">
            Listo: {result.count} venta{result.count === 1 ? '' : 's'} liquidada{result.count === 1 ? '' : 's'}, entraron{' '}
            {soles(result.cash)} a tu caja.
          </p>
        ) : null}
        <p className="hint">La boutique no te debe nada.</p>
      </>
    );
  }
  const chosen = pending.filter((s) => selected.has(s.id));
  const sum = (pick) => chosen.reduce((total, s) => total + pick(s), 0);
  const toggle = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="pivot-scroll">
        <table className="report-table boutique-pending-table">
          <thead>
            <tr>
              <th scope="col">
                <input
                  type="checkbox"
                  aria-label="Elegir todas"
                  checked={chosen.length === pending.length}
                  onChange={(e) => setSelected(new Set(e.target.checked ? pending.map((s) => s.id) : []))}
                />
              </th>
              <th scope="col">Venta</th>
              <th scope="col" className="num">Vendió en</th>
              <th scope="col" className="num">Su comisión</th>
              <th scope="col" className="num">Te paga</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((sale) => (
              <tr key={sale.id}>
                <td>
                  <input type="checkbox" aria-label={`Elegir ${sale.name}`} checked={selected.has(sale.id)} onChange={() => toggle(sale.id)} />
                </td>
                <th scope="row">
                  {sale.name}
                  {sale.quantity > 1 ? ` × ${sale.quantity}` : ''}
                  <span className="boutique-sub">
                    {sale.sedeName} · {dayFmt.format(new Date(sale.createdAt))}
                  </span>
                </th>
                <td className="num">{soles(sale.due.balance)}</td>
                <td className="num">−{soles(sale.due.fee)}</td>
                <td className="num">
                  <strong>{soles(sale.due.cash)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="boutique-settle">
        <p>
          {chosen.length} venta{chosen.length === 1 ? '' : 's'}: {soles(sum((s) => s.due.balance))} − comisión{' '}
          {soles(sum((s) => s.due.fee))} = <strong>te paga {soles(sum((s) => s.due.cash))}</strong>
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={!chosen.length || saving}
          onClick={() =>
            startSaving(async () => {
              const response = await settleBoutiqueSalesAction(chosen.map((s) => s.id));
              setResult(response);
            })
          }
        >
          {saving ? 'Guardando...' : `Me pagó ${soles(sum((s) => s.due.cash))}`}
        </button>
      </div>
      {result?.error ? <p className="form-error">{result.error}</p> : null}
      {result?.cash != null && !result.error ? (
        <p className="form-ok">
          Listo: entraron {soles(result.cash)} a tu caja.
        </p>
      ) : null}
    </>
  );
}

const MOVE_LABELS = { entrega: 'Dejaste', devolucion: 'Te devolvió', venta: 'Vendió' };

function MovesList({ moves, sales, config }) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const pendingIds = new Set(sales.filter((s) => s.pending && s.due.balance === s.total).map((s) => s.id));
  if (!moves.length) return null;
  const run = (fn, message) => {
    if (!window.confirm(message)) return;
    setError(null);
    startBusy(async () => {
      const response = await fn();
      if (response?.error) setError(response.error);
    });
  };
  return (
    <>
      {error ? <p className="form-error">{error}</p> : null}
      <ul className="boutique-moves">
        {moves.map((move) => (
          <li key={move.id}>
            <span className={`boutique-move boutique-move-${move.kind}`}>{MOVE_LABELS[move.kind]}</span>
            <span className="boutique-move-text">
              {move.quantity} × {move.code ? `${move.code} · ` : ''}
              {move.name}
              {move.unitPrice != null ? ` · ${soles(move.unitPrice)}` : ''}
              <span className="boutique-sub">
                {move.sedeName} · {dayFmt.format(new Date(move.occurredAt))}
              </span>
            </span>
            {move.kind === 'venta' ? (
              pendingIds.has(move.saleId) ? (
                <button
                  type="button"
                  className="btn-link-danger"
                  disabled={busy}
                  onClick={() => run(() => cancelBoutiqueSaleAction(move.saleId), `¿Anular la venta de ${move.name}? Vuelve a la boutique.`)}
                >
                  Anular
                </button>
              ) : null
            ) : (
              <span className="boutique-move-actions">
                {move.kind === 'entrega' ? (
                  <button
                    type="button"
                    className="btn-link-edit"
                    onClick={() => setEditing(editing === move.id ? null : move.id)}
                  >
                    Editar
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-link-danger"
                  disabled={busy}
                  onClick={() => run(() => deleteBoutiqueMoveAction(move.id), '¿Borrar este movimiento? El stock se corrige solo.')}
                >
                  Borrar
                </button>
              </span>
            )}
            {editing === move.id ? (
              <EditDeliveryForm delivery={move} config={config} onDone={() => setEditing(null)} />
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function BoutiqueControl({ board }) {
  const t = board.totals;
  return (
    <>
      <div className="kpi-grid">
        <Kpi
          label="En la boutique"
          value={`${t.units} perfume${t.units === 1 ? '' : 's'}`}
          sub={`${soles(t.value)} a precio de boutique · ${board.sedes.map((s) => `${s.name}: ${s.units}`).join(' · ')}`}
        />
        <Kpi label="Te debe" value={soles(t.owed)} sub="Ya sin su comisión" tone={t.owed > 0 ? 'bad' : undefined} />
        <Kpi label="Vendió" value={soles(t.soldTotal)} sub={`${t.count} perfume${t.count === 1 ? '' : 's'} · su comisión ${soles(t.fees)}`} />
        <Kpi label="Ganaste en la boutique" value={soles(t.profit)} sub="Después del costo y su comisión" tone="good" />
      </div>

      <ConfigForm config={board.config} />
      <DeliverForm catalog={board.catalog} config={board.config} taxPercent={board.taxPercent} rounding={board.rounding} />
      <DeliveryExcel deliveries={board.deliveries} config={board.config} />

      <div className="chart-card">
        <h3 className="chart-title">Lo que tiene cada sede</h3>
        <StockTable stock={board.stock} sedes={board.sedes} config={board.config} />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Por cobrar a la boutique</h3>
        <p className="hint">
          Cuando te pague, marca las ventas y toca «Me pagó». Su comisión se descuenta sola y en tu caja entra solo lo que
          recibiste.
        </p>
        <PendingPayments pending={board.pending} />
      </div>

      {board.moves.length ? (
        <div className="chart-card">
          <h3 className="chart-title">Movimientos</h3>
          <MovesList moves={board.moves} sales={board.sales} config={board.config} />
        </div>
      ) : null}
    </>
  );
}
