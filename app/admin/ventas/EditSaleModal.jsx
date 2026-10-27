'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteCreditPaymentAction, editSaleAction, listSalePaymentsAction } from '@/lib/actions';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' });

/**
 * Abonos de la venta con un botón para quitar el que se registró por error.
 * Mientras una venta tenga abonos no se puede cambiar su precio ni eliminarla.
 */
function SalePayments({ saleId }) {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    listSalePaymentsAction(saleId)
      .then(setPayments)
      .catch(() => setError('No se pudieron cargar los abonos.'));
  }, [saleId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!payments || payments.length === 0) return null;

  function remove(payment) {
    if (!window.confirm(`¿Quitar el abono de ${soles(payment.amount)}? Úsalo si el cliente en realidad no pagó.`)) return;
    setError('');
    startTransition(async () => {
      const result = await deleteCreditPaymentAction(payment.id);
      if (result?.error) setError(result.error);
      else load();
    });
  }

  return (
    <div className="sale-payments-box">
      <p className="sale-payments-title">Abonos registrados</p>
      <ul>
        {payments.map((p) => (
          <li key={p.id}>
            <span>
              <strong>{soles(p.amount)}</strong> · {dateFmt.format(new Date(p.paidAt))}
              {p.note ? ` · ${p.note}` : ''}
            </span>
            <button type="button" className="btn-link-danger" disabled={isPending} onClick={() => remove(p)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">Si quitas todos los abonos, puedes cambiar el precio o la forma de pago, o eliminar la venta.</p>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

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
      <SalePayments saleId={sale.id} />
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
