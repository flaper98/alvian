'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOrderAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar pedido'}
    </button>
  );
}

export default function OrderForm({ perfumes }) {
  const [formKey, setFormKey] = useState(0);
  return <OrderFormFields key={formKey} perfumes={perfumes} onSaved={() => setFormKey((k) => k + 1)} />;
}

function OrderFormFields({ perfumes, onSaved }) {
  const [state, formAction] = useActionState(createOrderAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar pedido</h2>
      <label>
        Cliente
        <input name="customerName" type="text" placeholder="¿Quién lo pidió?" required />
      </label>
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
        Cantidad
        <input name="quantity" type="number" min="1" step="1" required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: color, talla, para cuándo lo quiere" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
      <p className="hint">
        Aquí solo anotas el compromiso (quién y qué quiere). El precio y el pago se registran
        después, cuando lo compres y lo vendas normalmente en Ventas.
      </p>
    </form>
  );
}
