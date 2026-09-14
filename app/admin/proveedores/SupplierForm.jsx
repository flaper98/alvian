'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createSupplierAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Creando...' : 'Agregar proveedor'}
    </button>
  );
}

export default function SupplierForm() {
  const [formKey, setFormKey] = useState(0);
  return <SupplierFormFields key={formKey} onSaved={() => setFormKey((k) => k + 1)} />;
}

function SupplierFormFields({ onSaved }) {
  const [state, formAction] = useActionState(createSupplierAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Nuevo proveedor</h2>
      <label>
        Nombre
        <input name="name" type="text" placeholder="Ej: Tio Flagancy" required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: contacto, condiciones de pago" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
