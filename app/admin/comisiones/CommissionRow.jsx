'use client';

import { useTransition } from 'react';
import { setCommissionPaidAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

export default function CommissionRow({ sale, canEdit }) {
  const [isPending, startTransition] = useTransition();
  const fullyCollected = sale.payment_type === 'contado' || Number(sale.balance) <= 0;

  function togglePaid() {
    startTransition(async () => {
      try {
        await setCommissionPaidAction(sale.id, !sale.commission_paid);
      } catch (error) {
        alert(error?.message || 'No se pudo actualizar la comisión.');
      }
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
        {!fullyCollected ? (
          <p className="hint">
            Cobro pendiente: el cliente todavía debe S/ {Number(sale.balance).toFixed(2)} de esta
            venta. La comisión se puede pagar recién cuando termine de pagarla.
          </p>
        ) : null}
      </div>
      <div className="commission-controls">
        {canEdit ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={togglePaid}
            disabled={isPending || (!sale.commission_paid && !fullyCollected)}
            title={
              !sale.commission_paid && !fullyCollected
                ? 'El cliente aún no termina de pagar esta venta.'
                : undefined
            }
          >
            {sale.commission_paid ? 'Marcar como pendiente' : 'Marcar como pagada'}
          </button>
        ) : (
          <span className={`badge ${sale.commission_paid ? 'badge-paid' : 'badge-pending'}`}>
            <span className="badge-icon">
              {sale.commission_paid ? <IconCheck size={12} /> : <IconClock size={12} />}
            </span>
            {sale.commission_paid ? 'Pagada' : fullyCollected ? 'Lista para pagar' : 'Cobro pendiente'}
          </span>
        )}
      </div>
    </li>
  );
}
