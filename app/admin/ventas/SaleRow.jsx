'use client';

import { useState, useTransition } from 'react';
import { deleteSaleAction, setSaleDeliveredAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';
import EditSaleModal from './EditSaleModal';

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

const money = (value) => `S/ ${Number(value).toFixed(2)}`;

/** Estado de cobro de una venta: al contado se cobra al momento; a crédito o
 * pandero depende de los abonos registrados. Los montos van en centavos
 * redondeados para que S/ 0.001 de diferencia no la deje como "debe". */
export function saleCollection(sale) {
  const total = Number(sale.total) || 0;
  if (sale.payment_type === 'contado') return { state: 'contado', paid: total, balance: 0, total };
  const paid = Math.round((Number(sale.paid_amount) || 0) * 100) / 100;
  const balance = Math.max(Math.round((total - paid) * 100) / 100, 0);
  const state = balance <= 0 ? 'cancelado' : paid > 0 ? 'parcial' : 'sin-abono';
  return { state, paid, balance, total };
}

function CollectionStatus({ sale }) {
  const { state, paid, balance, total } = saleCollection(sale);
  if (state === 'contado') return null;
  if (state === 'cancelado') {
    return (
      <span className="badge badge-paid">
        <span className="badge-icon">
          <IconCheck size={12} />
        </span>
        Cancelado
      </span>
    );
  }
  const percent = Math.round((paid / total) * 100);
  return (
    <div className="collection-status">
      <span className="badge badge-debt">Debe {money(balance)}</span>
      <span className="collection-detail">
        {state === 'parcial' ? `Abonó ${money(paid)} de ${money(total)}` : 'Sin abonos'}
      </span>
      <span className="collection-bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}

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
          <div className="payment-cell">
            <span className={`badge badge-${sale.payment_type}`}>
              {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
            </span>
            <CollectionStatus sale={sale} />
            {/* Margen de la venta (Distribución): solo lo ve el admin. */}
            {canManage && sale.margin_percent != null ? (
              <span
                className={`badge ${sale.low_margin ? 'badge-debt' : 'badge-contado'}`}
                title={`Utilidad neta S/ ${Number(sale.net_profit).toFixed(2)}`}
              >
                {sale.low_margin ? '⚠ ' : ''}Margen {Number(sale.margin_percent).toFixed(0)}%
              </span>
            ) : null}
          </div>
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
