'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { SubmitButton, ImageField } from '../catalogo/AddPerfumeForm';
import { createHeroBannerAction } from '@/lib/actions';
import PerfumeLinkField from './PerfumeLinkField';

function BannerFormFields({ perfumes, onSaved }) {
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
      <PerfumeLinkField perfumes={perfumes} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton label="Agregar banner" pendingLabel="Guardando..." />
    </form>
  );
}

export default function BannerForm({ perfumes, onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <BannerFormFields
      key={formKey}
      perfumes={perfumes}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}
