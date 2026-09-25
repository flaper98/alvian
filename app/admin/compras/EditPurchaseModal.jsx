'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { editPurchaseAction } from '@/lib/actions';
import PaidWithField from '../PaidWithField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditPurchaseForm({ purchase, onClose }) {
  const boundAction = editPurchaseAction.bind(null, purchase.id);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [quantity, setQuantity] = useState(String(purchase.quantity));
  const [unitCost, setUnitCost] = useState(String(purchase.unit_cost));
  const [freightCost, setFreightCost] = useState(
    Number(purchase.freight_cost) > 0 ? String(purchase.freight_cost) : '',
  );
  const [marginPerUnit, setMarginPerUnit] = useState('');

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const landedUnitCost = useMemo(() => {
    const q = Number(quantity);
    const c = Number(unitCost);
    const f = freightCost === '' ? 0 : Number(freightCost);
    if (!q || q <= 0 || unitCost === '' || Number.isNaN(c) || Number.isNaN(f)) return null;
    return (q * c + f) / q;
  }, [quantity, unitCost, freightCost]);

  const suggestedPrice = useMemo(() => {
    if (landedUnitCost === null || marginPerUnit === '') return null;
    const margin = Number(marginPerUnit);
    if (Number.isNaN(margin)) return null;
    return landedUnitCost + margin;
  }, [landedUnitCost, marginPerUnit]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar compra</h2>
      <p className="hint">
        Perfume: <strong>{purchase.perfume_name}</strong> (no se puede cambiar; elimina y crea una
        compra nueva si te equivocaste de perfume).
      </p>
      <label>
        Cantidad comprada
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
      <label>
        Costo unitario (S/)
        <input
          name="unitCost"
          type="number"
          min="0"
          step="0.01"
          required
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
        />
      </label>
      <label>
        Flete / envío total (S/)
        <input
          name="freightCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={freightCost}
          onChange={(event) => setFreightCost(event.target.value)}
        />
      </label>

      {landedUnitCost !== null ? (
        <p className="hint">Costo real por unidad: S/ {landedUnitCost.toFixed(2)}</p>
      ) : null}

      <label>
        Ganancia deseada por unidad (S/)
        <input
          name="marginPerUnit"
          type="number"
          min="0"
          step="0.01"
          placeholder="Déjalo vacío para no tocar el precio de venta"
          value={marginPerUnit}
          onChange={(event) => setMarginPerUnit(event.target.value)}
        />
      </label>
      <p className="hint">
        {suggestedPrice !== null
          ? `Se actualizará el precio de venta a: S/ ${suggestedPrice.toFixed(2)}`
          : 'Precio de venta actual del perfume — solo cambia si completas la ganancia.'}
      </p>

      <label>
        Nota (opcional)
        <input name="note" type="text" defaultValue={purchase.note || ''} />
      </label>
      <PaidWithField defaultValue={purchase.paid_with} />
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

export default function EditPurchaseModal({ purchase, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditPurchaseForm purchase={purchase} onClose={onClose} />
      </div>
    </div>
  );
}
