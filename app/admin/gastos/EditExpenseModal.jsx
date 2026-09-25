'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { editExpenseAction } from '@/lib/actions';
import PaidWithField from '../PaidWithField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditExpenseForm({ expense, onClose }) {
  const boundAction = editExpenseAction.bind(null, expense.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar gasto</h2>
      <label>
        Descripción
        <input name="description" type="text" defaultValue={expense.description} required />
      </label>
      <label>
        Monto (S/)
        <input name="amount" type="number" min="0.01" step="0.01" defaultValue={expense.amount} required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" defaultValue={expense.note || ''} />
      </label>
      <PaidWithField defaultValue={expense.paid_with} />
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

export default function EditExpenseModal({ expense, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditExpenseForm expense={expense} onClose={onClose} />
      </div>
    </div>
  );
}
