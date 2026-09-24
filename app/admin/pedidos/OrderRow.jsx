'use client';

import { useState, useTransition } from 'react';
import { setOrderFulfilledAction, deleteOrderAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';
import EditOrderModal from './EditOrderModal';

export default function OrderRow({ order, perfumes }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
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
    <>
      <tr className="perfume-table-row">
        <td className="perfume-table-stock-cell" data-label="Código">{order.order_code || '—'}</td>
        <td className="table-cards-title">
          <strong>{order.customer_name}</strong>
          {order.note ? <p className="perfume-table-description">Nota: {order.note}</p> : null}
        </td>
        <td data-label="Perfume">{order.perfume_name}</td>
        <td className="perfume-table-stock-cell" data-label="Cantidad">{order.quantity}</td>
        <td className="table-cards-full" data-label="Estado">
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
              {shortOnStock ? 'Falta comprar' : 'Hay stock, listo'}
            </span>
          )}
          {order.stocked ? <span className="badge badge-gold"> En stock</span> : null}
        </td>
        <td className={`perfume-table-stock-cell${shortOnStock ? ' text-critical' : ''}`} data-label="Stock actual">
          {order.perfume_stock}
        </td>
        <td data-label="Fecha">{new Date(order.created_at).toLocaleDateString('es-PE')}</td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)} disabled={isPending}>
            Editar
          </button>
          <button type="button" className="btn-secondary" onClick={toggleFulfilled} disabled={isPending}>
            {order.fulfilled ? 'Marcar pendiente' : 'Marcar cumplido'}
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            Eliminar
          </button>
        </td>
      </tr>
      {editing ? (
        <EditOrderModal order={order} perfumes={perfumes} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}
