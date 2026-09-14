'use client';

import { useTransition } from 'react';
import { setSaleDeliveredAction } from '@/lib/actions';

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

export default function PendingDeliveryRow({ sale }) {
  const [isPending, startTransition] = useTransition();
  const balance = Number(sale.balance);
  const isDeferred = ['credito', 'pandero'].includes(sale.payment_type);

  function markDelivered() {
    startTransition(async () => {
      try {
        await setSaleDeliveredAction(sale.id, true);
      } catch (error) {
        alert(error?.message || 'No se pudo actualizar la entrega.');
      }
    });
  }

  return (
    <li className="history-row">
      <div>
        <strong>{sale.perfume_name}</strong>{' '}
        <span className={`badge badge-${sale.payment_type}`}>
          {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
        </span>
        <p>
          Cliente: {sale.customer_name || 'Sin nombre'} · {sale.quantity} unid. · Vendido el{' '}
          {new Date(sale.created_at).toLocaleDateString('es-PE')}
        </p>
        {isDeferred ? (
          <p>
            Total S/ {Number(sale.total).toFixed(2)} · Pagado S/ {Number(sale.paid_amount).toFixed(2)}{' '}
            · <strong>Saldo S/ {balance.toFixed(2)}</strong>
          </p>
        ) : null}
        {isDeferred ? (
          <p className="hint">
            Fechas de pago:{' '}
            {sale.payment_dates && sale.payment_dates.length > 0
              ? sale.payment_dates
                  .map((date) => new Date(date).toLocaleDateString('es-PE'))
                  .join(', ')
              : 'sin abonos registrados todavía'}
          </p>
        ) : null}
      </div>
      <button type="button" className="btn-secondary" onClick={markDelivered} disabled={isPending}>
        {isPending ? 'Guardando...' : 'Marcar como entregado'}
      </button>
    </li>
  );
}
