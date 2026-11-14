'use client';

import { useMemo, useRef, useState } from 'react';
import { formatSoles } from '@/lib/money.mjs';
import {
  DISCOUNT_MODES,
  percentLabel,
  receiptNumber,
  receiptText,
  receiptTotals,
  unitDiscount,
} from '@/lib/receipt.mjs';
import { PerfumePicker } from '../ventas/SaleForm';

// La hoja del PDF: A4 sin márgenes, así el navegador no tiene dónde escribir la
// fecha ni el nombre de la página. Va aquí (y no en globals.css) para que solo
// cambie la hoja de esta pantalla: se quita al salir de ella.
const PRINT_PAGE = '@media print { @page { size: A4; margin: 0; } }';

const dateFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });

// "Rosa Pérez" → "Rosa_Perez", para el nombre del PDF.
const fileSafe = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Arma el comprobante (cada perfume con su descuento) y lo descarga en PDF o lo copia para WhatsApp. */
export default function ReceiptBuilder({ perfumes, issuedAt: initialIssuedAt, site, whatsapp, business }) {
  const [lines, setLines] = useState([]);
  const [mode, setMode] = useState('soles');
  const [customer, setCustomer] = useState('');
  const [note, setNote] = useState('');
  const [issuedAt, setIssuedAt] = useState(initialIssuedAt);
  const [copied, setCopied] = useState(false);
  const freeLines = useRef(0);

  const totals = useMemo(() => receiptTotals(lines, mode), [lines, mode]);
  const number = receiptNumber(issuedAt);
  const dateLabel = dateFmt.format(new Date(issuedAt));
  const modeInfo = DISCOUNT_MODES.find((m) => m.key === mode);
  const ready = totals.items.length > 0;
  const client = customer.trim();
  const extra = note.trim();
  // En la tabla: "c/u" solo si algún perfume va por más de una unidad.
  const each = totals.items.some((i) => i.quantity > 1) ? ' c/u' : '';

  function addPerfume(perfume) {
    const key = `p${perfume.id}`;
    setLines((current) =>
      current.some((l) => l.key === key)
        ? current.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { key, name: perfume.name, quantity: 1, unitPrice: perfume.price, discount: '', free: false }],
    );
  }

  /** Un producto escrito a mano: decant, encargo o algo que no está en el catálogo. */
  function addFreeLine() {
    freeLines.current += 1;
    setLines((current) => [
      ...current,
      { key: `f${freeLines.current}`, name: '', quantity: 1, unitPrice: '', discount: '', free: true },
    ]);
  }

  const update = (key, changes) => setLines((current) => current.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const remove = (key) => setLines((current) => current.filter((l) => l.key !== key));

  // Cada forma se escribe distinto (S/, % o precio final): al cambiarla se borran los descuentos.
  function changeMode(next) {
    if (next === mode) return;
    setMode(next);
    setLines((current) => current.map((l) => ({ ...l, discount: '' })));
  }

  function reset() {
    setLines([]);
    setMode('soles');
    setCustomer('');
    setNote('');
    setIssuedAt(new Date().toISOString());
  }

  // "Guardar como PDF" usa el título de la página como nombre del archivo.
  function downloadPdf() {
    const previousTitle = document.title;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    document.title = ['Comprobante_Alvian', fileSafe(client), number].filter(Boolean).join('_');
    window.print();
  }

  async function copyText() {
    const text = receiptText(totals, { number, dateLabel, customer: client, note: extra, whatsapp, site });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sin permiso de portapapeles: se muestra en un cuadro para copiar a mano.
      window.prompt('Copia este texto:', text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="receipt-layout">
      <style>{PRINT_PAGE}</style>
      <div className="perfume-form sale-form receipt-form no-print">
        <section className="sale-step">
          <h3>
            <span>1</span> ¿Qué lleva?
          </h3>
          <PerfumePicker perfumes={perfumes} onPick={addPerfume} allowNoStock autoFocus={false} />
          {lines.length ? (
            <ul className="sale-lines receipt-lines">
              {lines.map((l) => (
                <li key={l.key}>
                  {l.free ? (
                    <input
                      className="receipt-line-name"
                      value={l.name}
                      placeholder="Producto (ej: decant 10 ml)"
                      aria-label="Nombre del producto"
                      maxLength={80}
                      onChange={(event) => update(l.key, { name: event.target.value })}
                    />
                  ) : (
                    <span className="sale-line-name">{l.name}</span>
                  )}
                  <div className="qty" aria-label={`Cantidad de ${l.name || 'producto'}`}>
                    <button
                      type="button"
                      aria-label="Quitar uno"
                      onClick={() => (l.quantity <= 1 ? remove(l.key) : update(l.key, { quantity: l.quantity - 1 }))}
                    >
                      −
                    </button>
                    <span>{l.quantity}</span>
                    <button type="button" aria-label="Agregar uno" onClick={() => update(l.key, { quantity: l.quantity + 1 })}>
                      +
                    </button>
                  </div>
                  <label className="sale-line-price">
                    <span className="sr-only">Precio normal de {l.name || 'producto'}</span>
                    S/
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.unitPrice}
                      onChange={(event) => update(l.key, { unitPrice: event.target.value })}
                    />
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Busca y toca un perfume para agregarlo. Se pone su precio normal y puedes cambiarlo.</p>
          )}
          <button type="button" className="btn-secondary receipt-add-free" onClick={addFreeLine}>
            + Otro producto (decant, encargo…)
          </button>
        </section>

        <section className="sale-step">
          <h3>
            <span>2</span> Descuento de cada perfume
          </h3>
          {lines.length ? (
            <>
              <div className="sale-payments" role="radiogroup" aria-label="Cómo escribes el descuento">
                {DISCOUNT_MODES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    role="radio"
                    aria-checked={mode === m.key}
                    className={`sale-payment${mode === m.key ? ' active' : ''}`}
                    onClick={() => changeMode(m.key)}
                  >
                    <strong>{m.label}</strong>
                    <small>{m.hint}</small>
                  </button>
                ))}
              </div>
              <p className="hint">
                {modeInfo.help} Va por unidad; si un perfume no tiene descuento, déjalo vacío.
              </p>
              <ul className="receipt-discounts">
                {lines.map((l) => {
                  const d = unitDiscount(l.unitPrice, l.discount, mode);
                  const label = l.name.trim() || 'Producto';
                  return (
                    <li key={l.key}>
                      <span className="receipt-discount-name">
                        {label}
                        {l.quantity > 1 ? ` × ${l.quantity}` : ''}
                        <small>Normal {formatSoles(d.unitPrice)}</small>
                      </span>
                      <label className="sale-line-price">
                        <span className="sr-only">
                          {mode === 'total' ? 'Precio final' : 'Descuento'} de {label}
                        </span>
                        {mode === 'percent' ? null : 'S/'}
                        <input
                          type="number"
                          min="0"
                          max={mode === 'percent' ? 100 : undefined}
                          step={mode === 'percent' ? '0.5' : '0.01'}
                          inputMode="decimal"
                          placeholder={mode === 'total' ? String(d.unitPrice || '0.00') : '0'}
                          value={l.discount}
                          onChange={(event) => update(l.key, { discount: event.target.value })}
                        />
                        {mode === 'percent' ? '%' : null}
                      </label>
                      <span className="receipt-discount-result">
                        {d.discount > 0 ? (
                          <>
                            {formatSoles(d.finalPrice)}
                            <small>
                              {formatSoles(-d.discount)} ({percentLabel(d.ratio)})
                            </small>
                          </>
                        ) : (
                          <small>Sin descuento</small>
                        )}
                      </span>
                      {d.warning ? <p className="form-error receipt-discount-warning">{d.warning}</p> : null}
                    </li>
                  );
                })}
              </ul>
              {totals.discount > 0 ? (
                <p className="hint">
                  Precio normal {formatSoles(totals.subtotal)} → paga <strong>{formatSoles(totals.total)}</strong> y se
                  ahorra {formatSoles(totals.discount)} ({percentLabel(totals.ratio)}).
                </p>
              ) : null}
            </>
          ) : (
            <p className="hint">Primero agrega los perfumes.</p>
          )}
        </section>

        <section className="sale-step">
          <h3>
            <span>3</span> Cliente <small className="hint">(opcional)</small>
          </h3>
          <input
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
            placeholder="Nombre del cliente"
            aria-label="Nombre del cliente"
            maxLength={80}
          />
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Nota (ej: Pagó con Yape · Se entrega el sábado)"
            aria-label="Nota para el cliente"
            maxLength={200}
          />
        </section>

        <div className="receipt-actions">
          <button type="button" className="btn-primary" disabled={!ready} onClick={downloadPdf}>
            Descargar PDF
          </button>
          <button type="button" className="btn-secondary" disabled={!ready} onClick={copyText}>
            {copied ? '¡Copiado! Pégalo en WhatsApp' : 'Copiar texto para WhatsApp'}
          </button>
          <button type="button" className="btn-secondary" onClick={reset}>
            Nuevo comprobante
          </button>
        </div>
        <p className="hint">Para el PDF, elige «Guardar como PDF» en la ventana que se abre.</p>
      </div>

      <article className="receipt" aria-label="Vista previa del comprobante">
        <header className="receipt-head">
          <div>
            <h2 className="receipt-kind">Comprobante</h2>
            <dl className="receipt-meta">
              <dt>Comprobante n.°</dt>
              <dd>{number}</dd>
              <dt>Fecha</dt>
              <dd>{dateLabel}</dd>
            </dl>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="receipt-logo" src="/logo.jpg" alt="Alvian Fragancias" width={120} height={120} />
        </header>

        {client || extra ? (
          <div className="receipt-customer">
            {client ? (
              <>
                <span className="receipt-label">Cliente</span>
                <strong>{client}</strong>
              </>
            ) : null}
            {extra ? <p>{extra}</p> : null}
          </div>
        ) : null}

        {ready ? (
          <table className="receipt-table">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Cant.</th>
                <th scope="col">Precio normal{each}</th>
                {totals.discount > 0 ? <th scope="col">Descuento{each}</th> : null}
                <th scope="col">Importe</th>
              </tr>
            </thead>
            <tbody>
              {totals.items.map((i, index) => (
                <tr key={index}>
                  <td>{i.name}</td>
                  <td>{i.quantity}</td>
                  <td>{formatSoles(i.unitPrice)}</td>
                  {totals.discount > 0 ? (
                    <td className="receipt-cell-off">
                      {i.unitDiscount > 0 ? (
                        <>
                          {formatSoles(-i.unitDiscount)}
                          <small>{percentLabel(i.ratio)}</small>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  ) : null}
                  <td>{formatSoles(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="receipt-empty">Agrega perfumes para ver el comprobante.</p>
        )}

        <div className="receipt-summary">
          {totals.discount > 0 ? (
            <p className="receipt-saving">
              <span>¡Te ahorras</span>
              <strong>{formatSoles(totals.discount)}</strong>
              <span>en esta compra!</span>
            </p>
          ) : null}
          <dl className="receipt-totals">
            {totals.discount > 0 ? (
              <>
                <div>
                  <dt>Precio normal:</dt>
                  <dd>{formatSoles(totals.subtotal)}</dd>
                </div>
                <div className="receipt-off">
                  <dt>Descuento ({percentLabel(totals.ratio)}):</dt>
                  <dd>{formatSoles(-totals.discount)}</dd>
                </div>
              </>
            ) : null}
            <div className="receipt-total">
              <dt>Total a pagar:</dt>
              <dd>{formatSoles(totals.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="receipt-foot">
          <p className="receipt-thanks">¡Gracias por tu compra!</p>
          <div className="receipt-foot-cols">
            {business.payment.length ? (
              <div>
                <h3>Formas de pago</h3>
                {business.payment.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
            <div>
              <h3>Contacto</h3>
              {business.contact.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <small className="receipt-legal">Este documento no es boleta ni factura electrónica.</small>
        </footer>
      </article>
    </div>
  );
}
