'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addCreditPaymentAction } from '@/lib/actions';

const PAYMENT_LABELS = { credito: 'Crédito', pandero: 'Pandero' };

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar abono'}
    </button>
  );
}

/** Un perfume del cliente: cuánto pagó (barra) y el botón para anotar un abono. */
export default function CreditSaleRow({ sale }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addCreditPaymentAction, { error: null });
  const total = Number(sale.total);
  const paid = Number(sale.paid_amount);
  const balance = Number(sale.balance);
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const progressLabel = balance <= 0 ? 'Pagado completo' : paid > 0 ? `Pagó ${percent}%` : 'Sin abonos';

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <li className={`credit-row${balance <= 0 ? ' is-paid' : ''}`}>
      <div className="credit-row-main">
        <div className="credit-row-name">
          <strong>{sale.perfume_name}</strong>
          <span className="credit-row-progress">
            <span className={`dist-pill dist-pill-${sale.payment_type}`}>
              {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
            </span>
            <span
              className="credit-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`Pagado ${percent}%`}
            >
              <span style={{ width: `${percent}%` }} />
            </span>
            <small>{progressLabel}</small>
          </span>
        </div>
        <span className="credit-num" data-label="Total">
          {soles(total)}
        </span>
        <span className="credit-num" data-label="Pagado">
          {soles(paid)}
        </span>
        <span className={`credit-num credit-balance${balance > 0 ? ' is-owed' : ''}`} data-label="Saldo">
          {soles(Math.max(balance, 0))}
        </span>
        <span className="credit-action">
          {balance > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
              {open ? 'Cancelar' : 'Registrar abono'}
            </button>
          ) : (
            <span className="credit-paid">✓ Pagado</span>
          )}
        </span>
      </div>
      {open ? (
        <form action={formAction} className="credit-payment-form credit-row-form">
          <input type="hidden" name="saleId" value={sale.id} />
          <label>
            Monto del abono (S/)
            <input name="amount" type="number" min="0.01" step="0.01" max={balance} defaultValue={balance} required autoFocus />
          </label>
          <label>
            Nota (opcional)
            <input name="note" type="text" placeholder="Ej: pagó por Yape" />
          </label>
          {state?.error ? <p className="form-error">{state.error}</p> : null}
          <SubmitButton />
        </form>
      ) : null}
    </li>
  );
}
