'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addCreditPaymentAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar abono'}
    </button>
  );
}

export default function CreditSaleRow({ sale }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(addCreditPaymentAction, { error: null });
  const balance = Number(sale.balance);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <li className="history-row credit-row">
      <div>
        <strong>{sale.perfume_name}</strong>
        <span> · Cliente: {sale.customer_name || 'Sin nombre'}</span>
        <p>
          Total S/ {Number(sale.total).toFixed(2)} · Pagado S/ {Number(sale.paid_amount).toFixed(2)}{' '}
          · <strong>Saldo S/ {balance.toFixed(2)}</strong>
        </p>
      </div>
      {balance > 0 ? (
        <div className="credit-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Cancelar' : 'Registrar abono'}
          </button>
          {open ? (
            <form action={formAction} className="credit-payment-form">
              <input type="hidden" name="saleId" value={sale.id} />
              <label>
                Monto del abono (S/)
                <input name="amount" type="number" min="0.01" step="0.01" max={balance} required />
              </label>
              <label>
                Nota (opcional)
                <input name="note" type="text" />
              </label>
              {state?.error ? <p className="form-error">{state.error}</p> : null}
              <SubmitButton />
            </form>
          ) : null}
        </div>
      ) : (
        <span className="badge badge-paid">Pagado</span>
      )}
    </li>
  );
}
