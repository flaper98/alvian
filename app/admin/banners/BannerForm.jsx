'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { SubmitButton, ImageField } from '../catalogo/AddPerfumeForm';
import { createHeroBannerAction } from '@/lib/actions';

function BannerFormFields({ onSaved }) {
  const [state, formAction] = useActionState(createHeroBannerAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Agregar banner</h2>
      <ImageField label="Imagen del banner" />
      <label>
        Texto alternativo
        <input name="altText" type="text" placeholder="Ej: Promoción Club de Nuit Sillage" required />
        <span className="hint">
          Describe qué muestra la imagen. Lo usan los lectores de pantalla y Google (no se ve en
          el sitio).
        </span>
      </label>
      <label>
        Enlace al hacer clic (opcional)
        <input name="linkUrl" type="text" placeholder="Ej: /perfume/club-de-nuit-sillage o #catalogo" />
        <span className="hint">Si lo dejas vacío, el banner no será clicable.</span>
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton label="Agregar banner" pendingLabel="Guardando..." />
    </form>
  );
}

export default function BannerForm({ onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <BannerFormFields
      key={formKey}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}
