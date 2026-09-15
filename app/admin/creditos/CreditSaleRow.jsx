'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addCreditPaymentAction } from '@/lib/actions';
import { IconCheck } from '../icons';

const PAYMENT_LABELS = { credito: 'Crédito', pandero: 'Pandero' };

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
    <>
      <tr className="perfume-table-row">
        <td>
          <strong>{sale.perfume_name}</strong>
        </td>
        <td>
          <span className={`badge badge-${sale.payment_type}`}>
            {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
          </span>
        </td>
        <td className="perfume-table-price-cell">S/ {Number(sale.total).toFixed(2)}</td>
        <td className="perfume-table-price-cell">S/ {Number(sale.paid_amount).toFixed(2)}</td>
        <td className="perfume-table-price-cell">
          <strong>S/ {balance.toFixed(2)}</strong>
        </td>
        <td className="perfume-table-actions-cell">
          {balance > 0 ? (
            <button type="button" className="btn-secondary" onClick={() => setOpen((value) => !value)}>
              {open ? 'Cancelar' : 'Registrar abono'}
            </button>
          ) : (
            <span className="badge badge-paid">
              <span className="badge-icon">
                <IconCheck size={12} />
              </span>
              Pagado
            </span>
          )}
        </td>
      </tr>
      {open ? (
        <tr className="perfume-table-row">
          <td colSpan={6}>
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
          </td>
        </tr>
      ) : null}
    </>
  );
}
