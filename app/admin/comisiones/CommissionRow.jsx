'use client';

import { useTransition } from 'react';
import { setCommissionPaidAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

export default function CommissionRow({ sale, canEdit }) {
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
        <p>
          Comisión: <strong>S/ {sale.commission_amount ? Number(sale.commission_amount).toFixed(2) : '0.00'}</strong>
        </p>
      </div>
      <div className="commission-controls">
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
