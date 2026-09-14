'use client';

import { useTransition } from 'react';
import { setOrderFulfilledAction, deleteOrderAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

export default function OrderRow({ order }) {
  const [isPending, startTransition] = useTransition();
  const shortOnStock = order.perfume_stock < order.quantity;

  function toggleFulfilled() {
    startTransition(async () => {
      await setOrderFulfilledAction(order.id, !order.fulfilled);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar el pedido de "${order.customer_name}"?`)) return;
    startTransition(async () => {
      await deleteOrderAction(order.id);
    });
  }

  return (
    <li className="history-row">
      <div>
        <strong>{order.customer_name}</strong>
        <span>
          {' '}
          · {order.perfume_name} · {order.quantity} unid.
        </span>{' '}
        {order.fulfilled ? (
          <span className="badge badge-paid">
            <span className="badge-icon">
              <IconCheck size={12} />
            </span>
            Cumplido
          </span>
        ) : (
          <span className={`badge ${shortOnStock ? 'badge-pending' : 'badge-contado'}`}>
            <span className="badge-icon">
              <IconClock size={12} />
            </span>
            {shortOnStock ? 'Falta comprar' : 'Hay stock, listo para entregar'}
          </span>
        )}
        <p className="hint">Stock actual del perfume: {order.perfume_stock}</p>
        {order.note ? <p>Nota: {order.note}</p> : null}
      </div>
      <div className="perfume-row-actions">
        <time>{new Date(order.created_at).toLocaleDateString('es-PE')}</time>
        <button type="button" className="btn-secondary" onClick={toggleFulfilled} disabled={isPending}>
          {order.fulfilled ? 'Marcar pendiente' : 'Marcar cumplido'}
        </button>
        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
          Eliminar
        </button>
      </div>
    </li>
  );
}
