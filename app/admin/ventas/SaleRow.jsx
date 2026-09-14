'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { editSaleAction, deleteSaleAction, setSaleDeliveredAction } from '@/lib/actions';
import { IconCheck, IconClock } from '../icons';

const PAYMENT_LABELS = { contado: 'Contado', credito: 'Crédito', pandero: 'Pandero' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditSaleForm({ sale, onCancel, onSaved }) {
  const boundAction = editSaleAction.bind(null, sale.id);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [paymentType, setPaymentType] = useState(sale.payment_type);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <label>
        Cantidad
        <input name="quantity" type="number" min="1" step="1" defaultValue={sale.quantity} required />
      </label>
      <label>
        Precio de venta (S/)
        <input
          name="unitPrice"
          type="number"
          min="0"
          step="0.01"
          defaultValue={sale.unit_price}
          required
        />
      </label>
      <label>
        Forma de pago
        <select
          name="paymentType"
          required
          value={paymentType}
          onChange={(event) => setPaymentType(event.target.value)}
        >
          <option value="contado">Contado</option>
          <option value="credito">Crédito</option>
          <option value="pandero">Pandero</option>
        </select>
      </label>
      <label>
        Cliente {['credito', 'pandero'].includes(paymentType) ? '(obligatorio)' : '(opcional)'}
        <input
          name="customerName"
          type="text"
          defaultValue={sale.customer_name || ''}
          required={['credito', 'pandero'].includes(paymentType)}
        />
      </label>
      <label>
        Vendido por
        <select name="soldByRole" required defaultValue={sale.sold_by_role}>
          <option value="admin">Admin</option>
          <option value="vendedora">Vendedora</option>
        </select>
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton />
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function SaleRow({ sale, canManage }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar esta venta de "${sale.perfume_name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteSaleAction(sale.id);
      } catch (error) {
        alert(error?.message || 'No se pudo eliminar la venta.');
      }
    });
  }

  function toggleDelivered() {
    startTransition(async () => {
      try {
        await setSaleDeliveredAction(sale.id, !sale.delivered);
      } catch (error) {
        alert(error?.message || 'No se pudo actualizar la entrega.');
      }
    });
  }

  if (editing) {
    return (
      <li className="history-row perfume-row-editing">
        <EditSaleForm
          sale={sale}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="history-row">
      <div>
        <strong>{sale.perfume_name}</strong>
        <span>
          {' '}
          · {sale.quantity} unid. · S/ {Number(sale.total).toFixed(2)}
        </span>{' '}
        <span className={`badge badge-${sale.payment_type}`}>
          {PAYMENT_LABELS[sale.payment_type] || sale.payment_type}
        </span>{' '}
        <span className={`badge ${sale.delivered ? 'badge-paid' : 'badge-pending'}`}>
          <span className="badge-icon">
            {sale.delivered ? <IconCheck size={12} /> : <IconClock size={12} />}
          </span>
          {sale.delivered ? 'Entregado' : 'Pendiente de entrega'}
        </span>
        {sale.customer_name ? <p>Cliente: {sale.customer_name}</p> : null}
        <p className="hint">
          Vendido por: {sale.sold_by_name || (sale.sold_by_role === 'admin' ? 'Admin' : 'Vendedora')}
        </p>
      </div>
      <div className="perfume-row-actions">
        <time>{new Date(sale.created_at).toLocaleDateString('es-PE')}</time>
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
      </div>
    </li>
  );
}
