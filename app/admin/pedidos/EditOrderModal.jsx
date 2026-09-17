'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateOrderAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditOrderForm({ order, perfumes, onClose }) {
  const boundAction = updateOrderAction.bind(null, order.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar pedido</h2>
      <label>
        Cliente
        <input name="customerName" type="text" defaultValue={order.customer_name} required />
      </label>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue={order.perfume_id}>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id}>
              {perfume.name} (stock actual: {perfume.stock})
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input name="quantity" type="number" min="1" step="1" defaultValue={order.quantity} required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" defaultValue={order.note || ''} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function EditOrderModal({ order, perfumes, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditOrderForm order={order} perfumes={perfumes} onClose={onClose} />
      </div>
    </div>
  );
}
