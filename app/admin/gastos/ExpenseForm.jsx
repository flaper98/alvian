'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerExpenseAction } from '@/lib/actions';
import PaidWithField from '../PaidWithField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar gasto'}
    </button>
  );
}

export default function ExpenseForm({ onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <ExpenseFormFields
      key={formKey}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}

function ExpenseFormFields({ onSaved }) {
  const [state, formAction] = useActionState(registerExpenseAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar gasto</h2>
      <label>
        Descripción
        <input name="description" type="text" placeholder="Ej: envío, empaque, publicidad" required />
      </label>
      <label>
        Monto (S/)
        <input name="amount" type="number" min="0.01" step="0.01" required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" />
      </label>
      <PaidWithField />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
