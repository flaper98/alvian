'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { editSaleAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditSaleForm({ sale, users, onCancel, onSaved }) {
  const boundAction = editSaleAction.bind(null, sale.id);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [paymentType, setPaymentType] = useState(sale.payment_type);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  const soldByOptions = [
    { role: 'admin', name: 'Admin' },
    ...users.map((user) => ({ role: user.role, name: user.name })),
  ];
  const currentOption =
    soldByOptions.find((opt) => opt.role === sale.sold_by_role && opt.name === sale.sold_by_name) ||
    soldByOptions.find((opt) => opt.role === sale.sold_by_role) ||
    soldByOptions[0];

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar venta</h2>
      <p className="hint">
        Perfume: <strong>{sale.perfume_name}</strong> (no se puede cambiar).
      </p>
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
        <select name="soldBy" required defaultValue={JSON.stringify(currentOption)}>
          {soldByOptions.map((opt) => (
            <option key={`${opt.role}-${opt.name}`} value={JSON.stringify(opt)}>
              {opt.name}
            </option>
          ))}
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

export default function EditSaleModal({ sale, users, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditSaleForm sale={sale} users={users} onCancel={onClose} onSaved={onClose} />
      </div>
    </div>
  );
}
