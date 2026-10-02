'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerQuickSaleAction } from '@/lib/actions';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENTS = [
  { key: 'contado', label: 'Contado', hint: 'Pagó todo' },
  { key: 'credito', label: 'Crédito', hint: 'Paga en partes' },
  { key: 'pandero', label: 'Pandero', hint: 'Por cuotas del grupo' },
];

function SubmitButton({ total, disabled }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary sale-submit" disabled={pending || disabled}>
      {pending ? 'Guardando…' : `Registrar venta · ${soles(total)}`}
    </button>
  );
}

/** Buscador de perfumes: toca uno para agregarlo a la venta. */
function PerfumePicker({ perfumes, onPick }) {
  const [search, setSearch] = useState('');
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term ? perfumes.filter((p) => p.name.toLowerCase().includes(term)) : perfumes;
    // Primero los que tienen stock.
    return [...list].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name)).slice(0, 8);
  }, [perfumes, search]);

  return (
    <div className="sale-picker">
      <input
        type="search"
        placeholder="Buscar perfume… (ej: yara, hawas)"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Buscar perfume"
        autoFocus
      />
      <ul className="sale-results">
        {results.map((p) => {
          const noStock = Number(p.stock) <= 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                className="sale-result"
                disabled={noStock}
                onClick={() => {
                  onPick(p);
                  setSearch('');
                }}
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" />
                ) : (
                  <span className="sale-result-noimg" aria-hidden="true" />
                )}
                <span className="sale-result-name">{p.name}</span>
                <span className="sale-result-meta">
                  {Number(p.price) > 0 ? soles(p.price) : 'Sin precio'} ·{' '}
                  <span className={noStock ? 'text-critical' : ''}>{noStock ? 'Sin stock' : `Stock ${p.stock}`}</span>
                </span>
                {!noStock ? <span className="sale-result-add" aria-hidden="true">+</span> : null}
              </button>
            </li>
          );
        })}
        {results.length === 0 ? <li className="hint">Ningún perfume coincide.</li> : null}
      </ul>
    </div>
  );
}

function SaleFormFields({ perfumes, customers, onSaved }) {
  const [state, formAction] = useActionState(registerQuickSaleAction, { error: null });
  const [lines, setLines] = useState([]);
  const [paymentType, setPaymentType] = useState('contado');
  const [initialPayment, setInitialPayment] = useState('');

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  const total = lines.reduce((sum, l) => sum + l.quantity * (Number(l.unitPrice) || 0), 0);
  const needsCustomer = paymentType !== 'contado';
  const stockOf = (id) => Number(perfumes.find((p) => p.id === id)?.stock || 0);

  function addPerfume(perfume) {
    setLines((current) => {
      const existing = current.find((l) => l.perfumeId === perfume.id);
      if (existing) {
        return current.map((l) =>
          l.perfumeId === perfume.id ? { ...l, quantity: Math.min(l.quantity + 1, stockOf(perfume.id)) } : l,
        );
      }
      return [
        ...current,
        { perfumeId: perfume.id, name: perfume.name, quantity: 1, unitPrice: Number(perfume.price) > 0 ? Number(perfume.price) : '' },
      ];
    });
  }

  function update(perfumeId, changes) {
    setLines((current) => current.map((l) => (l.perfumeId === perfumeId ? { ...l, ...changes } : l)));
  }

  return (
    <form action={formAction} className="perfume-form sale-form">
      <h2>Nueva venta</h2>

      <section className="sale-step">
        <h3>
          <span>1</span> ¿Qué perfumes vendiste?
        </h3>
        <PerfumePicker perfumes={perfumes} onPick={addPerfume} />
        {lines.length ? (
          <ul className="sale-lines">
            {lines.map((l) => (
              <li key={l.perfumeId}>
                <span className="sale-line-name">{l.name}</span>
                <div className="qty" aria-label={`Cantidad de ${l.name}`}>
                  <button
                    type="button"
                    aria-label="Quitar uno"
                    onClick={() =>
                      l.quantity <= 1
                        ? setLines((current) => current.filter((x) => x.perfumeId !== l.perfumeId))
                        : update(l.perfumeId, { quantity: l.quantity - 1 })
                    }
                  >
                    −
                  </button>
                  <span>{l.quantity}</span>
                  <button
                    type="button"
                    aria-label="Agregar uno"
                    disabled={l.quantity >= stockOf(l.perfumeId)}
                    onClick={() => update(l.perfumeId, { quantity: l.quantity + 1 })}
                  >
                    +
                  </button>
                </div>
                <label className="sale-line-price">
                  <span className="sr-only">Precio de {l.name}</span>
                  S/
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={l.unitPrice}
                    onChange={(event) => update(l.perfumeId, { unitPrice: event.target.value })}
                    required
                  />
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Busca y toca un perfume para agregarlo. Puedes agregar varios.</p>
        )}
      </section>

      <section className="sale-step">
        <h3>
          <span>2</span> ¿Cómo paga?
        </h3>
        <div className="sale-payments" role="radiogroup" aria-label="Forma de pago">
          {PAYMENTS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={paymentType === p.key}
              className={`sale-payment${paymentType === p.key ? ' active' : ''}`}
              onClick={() => setPaymentType(p.key)}
            >
              <strong>{p.label}</strong>
              <small>{p.hint}</small>
            </button>
          ))}
        </div>
        {paymentType === 'credito' ? (
          <label>
            ¿Dejó algo a cuenta? (opcional)
            <input
              name="initialPayment"
              type="number"
              min="0"
              step="0.01"
              max={total || undefined}
              inputMode="decimal"
              placeholder="0.00"
              value={initialPayment}
              onChange={(event) => setInitialPayment(event.target.value)}
            />
            {Number(initialPayment) > 0 && total > 0 ? (
              <span className="hint">Quedará debiendo {soles(Math.max(total - Number(initialPayment), 0))}</span>
            ) : null}
          </label>
        ) : null}
      </section>

      <section className="sale-step">
        <h3>
          <span>3</span> Cliente {needsCustomer ? '' : <small className="hint">(opcional)</small>}
        </h3>
        <input
          name="customerName"
          list="sale-customers"
          placeholder="Nombre del cliente"
          autoComplete="off"
          required={needsCustomer}
        />
        <datalist id="sale-customers">
          {customers.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <label className="checkbox-field">
          <input name="delivered" type="checkbox" defaultChecked />
          Ya se lo entregué
        </label>
        <details className="sale-more">
          <summary>¿Pagaste el envío u otro gasto de esta venta?</summary>
          <div className="prices-form-row">
            <label>
              Envío que pagaste tú (S/)
              <input name="logistics" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" />
            </label>
            <label>
              Otro gasto de la venta (S/)
              <input name="otherCosts" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" />
            </label>
          </div>
          <p className="hint">
            Si el cliente pagó el envío, déjalo en 0. Lo que pongas aquí se resta de la ganancia de esta
            venta y sale de la Caja como gasto.
          </p>
        </details>
      </section>

      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <input type="hidden" name="paymentType" value={paymentType} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton total={total} disabled={lines.length === 0} />
    </form>
  );
}

export default function SaleForm({ perfumes, customers = [], onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <SaleFormFields
      key={formKey}
      perfumes={perfumes}
      customers={customers}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}
