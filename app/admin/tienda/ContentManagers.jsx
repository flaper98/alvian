'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import {
  createFaqAction,
  updateFaqAction,
  deleteFaqAction,
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
} from '@/lib/store-actions';

function useDelete(action) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return {
    isPending,
    error,
    remove(id, text) {
      if (!window.confirm(text)) return;
      startTransition(async () => {
        const result = await action(id);
        setError(result?.error || '');
      });
    },
  };
}

function FaqRow({ faq }) {
  const [state, formAction] = useActionState(updateFaqAction.bind(null, faq.id), { error: null });
  const del = useDelete(deleteFaqAction);
  return (
    <li className="content-row">
      <form action={formAction} className="content-form">
        <input name="question" defaultValue={faq.question} required />
        <textarea name="answer" rows={2} defaultValue={faq.answer} required />
        <div className="content-row-actions">
          <label className="checkbox-row inline">
            <input type="checkbox" name="active" defaultChecked={faq.active} /> Visible
          </label>
          <button type="submit" className="btn-secondary">Guardar</button>
          <button
            type="button"
            className="btn-danger"
            disabled={del.isPending}
            onClick={() => del.remove(faq.id, '¿Eliminar esta pregunta?')}
          >
            Eliminar
          </button>
          {state?.success ? <span className="form-ok">✓</span> : null}
        </div>
        {state?.error || del.error ? <p className="form-error">{state?.error || del.error}</p> : null}
      </form>
    </li>
  );
}

function NewFaq() {
  const [key, setKey] = useState(0);
  const [state, formAction] = useActionState(createFaqAction, { error: null });
  useEffect(() => {
    if (state?.success) setKey((k) => k + 1);
  }, [state]);
  return (
    <form action={formAction} className="content-form content-new" key={key}>
      <input name="question" placeholder="Nueva pregunta" required />
      <textarea name="answer" rows={2} placeholder="Respuesta" required />
      <button type="submit" className="btn-primary">+ Agregar pregunta</button>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

export function FaqManager({ faqs }) {
  return (
    <div className="content-manager">
      <h2>Preguntas frecuentes</h2>
      {faqs.length === 0 ? (
        <p className="hint">
          Mientras no agregues ninguna, la tienda muestra 4 preguntas de ejemplo (originalidad,
          entrega, pagos y duración).
        </p>
      ) : null}
      <ul className="content-list">
        {faqs.map((faq) => (
          <FaqRow key={faq.id} faq={faq} />
        ))}
      </ul>
      <NewFaq />
    </div>
  );
}

function TestimonialFields({ t }) {
  return (
    <>
      <div className="grid-3">
        <input name="name" placeholder="Nombre" defaultValue={t?.name} required />
        <input name="city" placeholder="Ciudad (opcional)" defaultValue={t?.city || ''} />
        <select name="rating" defaultValue={t?.rating || 5}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)}
            </option>
          ))}
        </select>
      </div>
      <textarea name="text" rows={2} placeholder="Opinión del cliente" defaultValue={t?.text} required />
    </>
  );
}

function TestimonialRow({ t }) {
  const [state, formAction] = useActionState(updateTestimonialAction.bind(null, t.id), { error: null });
  const del = useDelete(deleteTestimonialAction);
  return (
    <li className="content-row">
      <form action={formAction} className="content-form">
        <TestimonialFields t={t} />
        <div className="content-row-actions">
          <label className="checkbox-row inline">
            <input type="checkbox" name="active" defaultChecked={t.active} /> Visible
          </label>
          <button type="submit" className="btn-secondary">Guardar</button>
          <button
            type="button"
            className="btn-danger"
            disabled={del.isPending}
            onClick={() => del.remove(t.id, '¿Eliminar esta opinión?')}
          >
            Eliminar
          </button>
          {state?.success ? <span className="form-ok">✓</span> : null}
        </div>
        {state?.error || del.error ? <p className="form-error">{state?.error || del.error}</p> : null}
      </form>
    </li>
  );
}

function NewTestimonial() {
  const [key, setKey] = useState(0);
  const [state, formAction] = useActionState(createTestimonialAction, { error: null });
  useEffect(() => {
    if (state?.success) setKey((k) => k + 1);
  }, [state]);
  return (
    <form action={formAction} className="content-form content-new" key={key}>
      <TestimonialFields />
      <button type="submit" className="btn-primary">+ Agregar opinión</button>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

export function TestimonialManager({ testimonials }) {
  return (
    <div className="content-manager">
      <h2>Opiniones de clientes</h2>
      <p className="hint">
        Usa solo opiniones reales (por ejemplo, capturas de WhatsApp con permiso del cliente). La
        sección no aparece en la tienda hasta que agregues al menos una.
      </p>
      <ul className="content-list">
        {testimonials.map((t) => (
          <TestimonialRow key={t.id} t={t} />
        ))}
      </ul>
      <NewTestimonial />
    </div>
  );
}
