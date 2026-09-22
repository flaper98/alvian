'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { ImageField } from '../catalogo/AddPerfumeForm';
import { updateHeroBannerAction } from '@/lib/actions';
import { slugify } from '@/lib/slug';
import PerfumeLinkField, { CATALOG_LINK_VALUE } from './PerfumeLinkField';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditBannerForm({ banner, perfumes, onClose }) {
  const boundAction = updateHeroBannerAction.bind(null, banner.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  // Si el enlace guardado ya corresponde a un perfume (o al catálogo),
  // preseleccionamos ese mismo perfume en vez de mostrarlo como "personalizado".
  const matchedPerfume = perfumes.find(
    (perfume) => banner.link_url === `/perfume/${slugify(perfume.name)}`,
  );
  const isCatalogLink = banner.link_url === '#catalogo';
  const initialSelection = matchedPerfume
    ? matchedPerfume.name
    : isCatalogLink
      ? CATALOG_LINK_VALUE
      : '';
  const initialCustomLink = matchedPerfume || isCatalogLink ? '' : banner.link_url || '';

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar banner</h2>
      <ImageField defaultValue={banner.image_url} label="Imagen del banner" />
      <label>
        Texto alternativo
        <input name="altText" type="text" defaultValue={banner.alt_text} required />
      </label>
      <PerfumeLinkField
        perfumes={perfumes}
        initialSelection={initialSelection}
        initialCustomLink={initialCustomLink}
      />
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

export default function EditBannerModal({ banner, perfumes, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditBannerForm banner={banner} perfumes={perfumes} onClose={onClose} />
      </div>
    </div>
  );
}
