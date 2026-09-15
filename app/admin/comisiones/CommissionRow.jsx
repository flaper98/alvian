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
    <tr className="perfume-table-row">
      <td>
        <strong>{sale.perfume_name}</strong>
        {sale.customer_name ? (
          <p className="perfume-table-description">Cliente: {sale.customer_name}</p>
        ) : null}
        {!fullyCollected ? (
          <p className="perfume-table-description">
            El cliente todavía debe S/ {Number(sale.balance).toFixed(2)} de esta venta.
          </p>
        ) : null}
      </td>
      <td className="perfume-table-price-cell">S/ {Number(sale.total).toFixed(2)}</td>
      <td className="perfume-table-price-cell">
        S/ {sale.commission_amount ? Number(sale.commission_amount).toFixed(2) : '0.00'}
      </td>
      <td>
        {sale.commission_paid ? (
          <span className="badge badge-paid">
            <span className="badge-icon">
              <IconCheck size={12} />
            </span>
            Pagada
          </span>
        ) : fullyCollected ? (
          <span className="badge badge-credito">Lista para pagar</span>
        ) : (
          <span className="badge badge-pending">
            <span className="badge-icon">
              <IconClock size={12} />
            </span>
            Cobro pendiente
          </span>
        )}
      </td>
      <td className="perfume-table-stock-cell">
        {new Date(sale.created_at).toLocaleDateString('es-PE')}
      </td>
      <td className="perfume-table-actions-cell">
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
        ) : null}
      </td>
    </tr>
  );
}
