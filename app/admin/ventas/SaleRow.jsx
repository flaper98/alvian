'use client';

import { useState, useTransition } from 'react';
import { deleteSaleAction, setSaleDeliveredAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';
import EditSaleModal from './EditSaleModal';

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

export default function SaleRow({ sale, canManage, users = [] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar esta venta de "${sale.perfume_name}"?`)) return;
    startTransition(async () => {
      try {
        const result = await deleteSaleAction(sale.id);
        if (result?.error) alert(result.error);
      } catch (error) {
        alert(error?.message || 'No se pudo eliminar la venta.');
      }
    });
  }

  function toggleDelivered() {
    startTransition(async () => {
      try {
        const result = await setSaleDeliveredAction(sale.id, !sale.delivered);
        if (result?.error) alert(result.error);
      } catch (error) {
        alert(error?.message || 'No se pudo actualizar la entrega.');
      }
    });
  }

  return (
    <>
      <tr className="perfume-table-row">
        <td className="table-cards-title">
          <strong>{sale.perfume_name}</strong>
          {sale.customer_name ? (
            <p className="perfume-table-description">Cliente: {sale.customer_name}</p>
          ) : null}
          <p className="perfume-table-description">
            Vendido por: {sale.sold_by_name || (sale.sold_by_role === 'admin' ? 'Admin' : 'Vendedora')}
          </p>
        </td>
        <td className="perfume-table-stock-cell" data-label="Cantidad">{sale.quantity}</td>
        <td className="perfume-table-price-cell" data-label="Total">S/ {Number(sale.total).toFixed(2)}</td>
        <td data-label="Pago">
          <span className={`badge badge-${sale.payment_type}`}>
            {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
          </span>
        </td>
        <td data-label="Entrega">
          <span className={`badge ${sale.delivered ? 'badge-paid' : 'badge-pending'}`}>
            <span className="badge-icon">
              {sale.delivered ? <IconCheck size={12} /> : <IconClock size={12} />}
            </span>
            {sale.delivered ? 'Entregado' : 'Pendiente'}
          </span>
        </td>
        <td className="perfume-table-stock-cell" data-label="Fecha">
          {new Date(sale.created_at).toLocaleDateString('es-PE')}
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={toggleDelivered} disabled={isPending}>
            {sale.delivered ? 'Marcar pendiente' : 'Marcar entregado'}
          </button>
          {canManage ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                Editar
              </button>
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          ) : null}
        </td>
      </tr>
      {editing ? (
        <EditSaleModal sale={sale} users={users} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}
