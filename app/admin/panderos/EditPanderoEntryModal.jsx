'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updatePanderoEntryAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditPanderoEntryForm({ entry, perfumes, onClose }) {
  const boundAction = updatePanderoEntryAction.bind(null, entry.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar participante</h2>
      <label>
        Nombre
        <input name="customerName" type="text" defaultValue={entry.customer_name} required autoFocus />
      </label>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue={entry.perfume_id}>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id}>
              {perfume.name}
            </option>
          ))}
        </select>
      </label>
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

export default function EditPanderoEntryModal({ entry, perfumes, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditPanderoEntryForm entry={entry} perfumes={perfumes} onClose={onClose} />
      </div>
    </div>
  );
}
