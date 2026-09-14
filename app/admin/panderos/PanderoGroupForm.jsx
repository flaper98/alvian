'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createPanderoGroupAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Creando...' : 'Crear pandero'}
    </button>
  );
}

export default function PanderoGroupForm() {
  const [formKey, setFormKey] = useState(0);
  return <PanderoGroupFormFields key={formKey} onSaved={() => setFormKey((k) => k + 1)} />;
}

function PanderoGroupFormFields({ onSaved }) {
  const [state, formAction] = useActionState(createPanderoGroupAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Nuevo pandero</h2>
      <label>
        Nombre
        <input name="name" type="text" placeholder="Ej: Pandero semanal" required />
      </label>
      <label>
        Fecha de inicio (turno del #1)
        <input name="startDate" type="date" required />
      </label>
      <label>
        Cada cuántos días le toca al siguiente
        <input name="intervalDays" type="number" min="1" step="1" defaultValue={7} required />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
