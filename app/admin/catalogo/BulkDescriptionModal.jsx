'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { bulkUpdateDescriptionsAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Actualizando...' : 'Actualizar descripciones'}
    </button>
  );
}

function BulkDescriptionForm() {
  const [state, formAction] = useActionState(bulkUpdateDescriptionsAction, { error: null });

  return (
    <form action={formAction} className="perfume-form">
      <h2>Actualizar descripciones en lote</h2>
      <label>
        Pega una línea por perfume: &quot;Nombre: descripción&quot; (el nombre debe ser exactamente
        igual al que ya tienes en tu catálogo)
        <textarea
          name="rawText"
          rows={10}
          placeholder={'Hawas Ice: Fragancia fresca y acuática, con notas heladas y fondo amaderado.\nClub de Nuit: Fragancia afrutada y amaderada, de gran proyección.'}
          required
        />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />

      {state?.result ? (
        <div className="supplier-bulk-result">
          {state.result.updated.length > 0 ? (
            <p className="supplier-bulk-ok">
              ✓ Actualizado ({state.result.updated.length}):{' '}
              {state.result.updated.map((u) => u.perfumeName).join(', ')}
            </p>
          ) : null}
          {state.result.unmatched.length > 0 ? (
            <p className="form-error">
              No se pudo actualizar ({state.result.unmatched.length}):{' '}
              {state.result.unmatched.map((u) => `${u.line} — ${u.reason}`).join(' / ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

export default function BulkDescriptionModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        Actualizar descripciones en lote
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <BulkDescriptionForm />
          </div>
        </div>
      ) : null}
    </>
  );
}
