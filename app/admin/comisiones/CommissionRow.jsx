'use client';

import { useTransition } from 'react';
import { payAvailableCommissionAction, resetCommissionPaymentAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

export default function CommissionRow({ sale, canEdit }) {
  const [isPending, startTransition] = useTransition();
  const payoutDue = Number(sale.commissionPayoutDue || 0);
  const paidSoFar = Number(sale.commission_paid_amount || 0);
  const isCredit = sale.payment_type !== 'contado';

  function handlePay() {
    startTransition(async () => {
      try {
        const result = await payAvailableCommissionAction(sale.id);
        if (result?.error) alert(result.error);
      } catch (error) {
        alert(error?.message || 'No se pudo pagar la comisión.');
      }
    });
  }

  function handleReset() {
    if (!confirm('¿Deshacer los pagos de comisión registrados para esta venta?')) return;
    startTransition(async () => {
      try {
        const result = await resetCommissionPaymentAction(sale.id);
        if (result?.error) alert(result.error);
      } catch (error) {
        alert(error?.message || 'No se pudo deshacer el pago.');
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
        {isCredit ? (
          <p className="perfume-table-description">
            Cobrado S/ {(Number(sale.total) - Number(sale.balance)).toFixed(2)} de S/{' '}
            {Number(sale.total).toFixed(2)}
          </p>
        ) : null}
      </td>
      <td className="perfume-table-price-cell">
        S/ {sale.commission_amount ? Number(sale.commission_amount).toFixed(2) : '0.00'}
      </td>
      <td className="perfume-table-price-cell">S/ {paidSoFar.toFixed(2)}</td>
      <td>
        {sale.commission_paid ? (
          <span className="badge badge-paid">
            <span className="badge-icon">
              <IconCheck size={12} />
            </span>
            Pagada
          </span>
        ) : payoutDue > 0 ? (
          <span className="badge badge-credito">Disponible: S/ {payoutDue.toFixed(2)}</span>
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
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePay}
              disabled={isPending || payoutDue <= 0}
              title={payoutDue <= 0 ? 'Todavía no hay comisión nueva disponible.' : undefined}
            >
              Pagar S/ {payoutDue.toFixed(2)}
            </button>
            {paidSoFar > 0 ? (
              <button type="button" className="btn-danger" onClick={handleReset} disabled={isPending}>
                Deshacer
              </button>
            ) : null}
          </>
        ) : null}
      </td>
    </tr>
  );
}
