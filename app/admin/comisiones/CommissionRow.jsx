'use client';

import { useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { setCommissionAction, setCommissionPaidAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar'}
    </button>
  );
}

export default function CommissionRow({ sale, canEdit }) {
  const boundAction = setCommissionAction.bind(null, sale.id);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [isPending, startTransition] = useTransition();

  function togglePaid() {
    startTransition(async () => {
      await setCommissionPaidAction(sale.id, !sale.commission_paid);
    });
  }

  return (
    <li className="history-row">
      <div>
        <strong>{sale.perfume_name}</strong>
        <span>
          {' '}
          · S/ {Number(sale.total).toFixed(2)} · {new Date(sale.created_at).toLocaleDateString('es-PE')}
        </span>
        {sale.customer_name ? <p>Cliente: {sale.customer_name}</p> : null}
      </div>
      <div className="commission-controls">
        {canEdit ? (
          <form action={formAction} className="inline-form">
            <input
              name="commissionAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={sale.commission_amount ?? ''}
              placeholder="Monto"
            />
            <SubmitButton />
          </form>
        ) : (
          <span>
            Comisión: S/{' '}
            {sale.commission_amount ? Number(sale.commission_amount).toFixed(2) : '—'}
          </span>
        )}
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        {canEdit ? (
          <button type="button" className="btn-secondary" onClick={togglePaid} disabled={isPending}>
            {sale.commission_paid ? 'Marcar como pendiente' : 'Marcar como pagada'}
          </button>
        ) : (
          <span className={`badge ${sale.commission_paid ? 'badge-paid' : 'badge-pending'}`}>
            <span className="badge-icon">
              {sale.commission_paid ? <IconCheck size={12} /> : <IconClock size={12} />}
            </span>
            {sale.commission_paid ? 'Pagada' : 'Pendiente'}
          </span>
        )}
      </div>
    </li>
  );
}
