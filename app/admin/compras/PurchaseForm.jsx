'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerPurchaseAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar compra'}
    </button>
  );
}

export default function PurchaseForm({ perfumes }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <PurchaseFormFields
      key={formKey}
      perfumes={perfumes}
      onSaved={() => setFormKey((key) => key + 1)}
    />
  );
}

function PurchaseFormFields({ perfumes, onSaved }) {
  const [state, formAction] = useActionState(registerPurchaseAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar compra</h2>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue="">
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
        <input name="quantity" type="number" min="1" step="1" required />
      </label>
      <label>
        Costo unitario (S/)
        <input name="unitCost" type="number" min="0" step="0.01" required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: proveedor, lote, etc." />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
