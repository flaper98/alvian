'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerPurchaseAction } from '@/lib/actions';
import PaidWithField from '../PaidWithField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar compra'}
    </button>
  );
}

export default function PurchaseForm({ perfumes, prefill, onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <PurchaseFormFields
      key={formKey}
      perfumes={perfumes}
      prefill={prefill}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}

function PurchaseFormFields({ perfumes, prefill, onSaved }) {
  const [state, formAction] = useActionState(registerPurchaseAction, { error: null });
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(prefill?.unitCost || '');
  const [freightCost, setFreightCost] = useState('');
  const [marginPerUnit, setMarginPerUnit] = useState('');

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

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
      <h2>Registrar compra</h2>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue={prefill?.perfumeId || ''}>
          <option value="" disabled>
            Selecciona un perfume
          </option>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id}>
              {perfume.name} (stock actual: {perfume.stock})
            </option>
          ))}
        </select>
      </label>
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
          placeholder="Ej: 15.00"
          value={marginPerUnit}
          onChange={(event) => setMarginPerUnit(event.target.value)}
        />
      </label>
      <p className="hint">
        {suggestedPrice !== null
          ? `Se guardará como precio de venta: S/ ${suggestedPrice.toFixed(2)}`
          : 'Si completas la ganancia, el precio de venta del producto se actualiza solo (se ve en la tienda).'}
      </p>

      <label>
        Nota (opcional)
        <input
          name="note"
          type="text"
          placeholder="Ej: proveedor, lote, etc."
          defaultValue={prefill?.note || ''}
        />
      </label>
      <PaidWithField />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
