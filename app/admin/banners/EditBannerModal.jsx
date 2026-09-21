'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ImageField } from '../catalogo/AddPerfumeForm';
import { updateHeroBannerAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditBannerForm({ banner, onClose }) {
  const boundAction = updateHeroBannerAction.bind(null, banner.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar banner</h2>
      <ImageField defaultValue={banner.image_url} label="Imagen del banner" />
      <label>
        Texto alternativo
        <input name="altText" type="text" defaultValue={banner.alt_text} required />
      </label>
      <label>
        Enlace al hacer clic (opcional)
        <input name="linkUrl" type="text" defaultValue={banner.link_url || ''} />
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

export default function EditBannerModal({ banner, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditBannerForm banner={banner} onClose={onClose} />
      </div>
    </div>
  );
}
