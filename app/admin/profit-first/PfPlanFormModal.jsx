'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { savePfPlanAction } from '@/lib/actions';
import { PF_CATEGORIES } from '@/lib/profit-first';

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || disabled}>
      {pending ? 'Guardando...' : 'Guardar porcentajes'}
    </button>
  );
}

function PlanForm({ percents, onSaved }) {
  const [state, formAction] = useActionState(savePfPlanAction, { error: null });
  const [values, setValues] = useState(() =>
    Object.fromEntries(PF_CATEGORIES.map((c) => [c.key, String(percents[c.key])])),
  );

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  const sum = PF_CATEGORIES.reduce((total, c) => total + (Number(values[c.key]) || 0), 0);
  const sumOk = Math.round(sum * 100) === 10000;

  return (
    <form action={formAction} className="perfume-form">
      <h2>Porcentajes del reparto</h2>
      {PF_CATEGORIES.map((category) => (
        <label key={category.key}>
          {category.label} (%)
          <input
            name={`percent_${category.key}`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values[category.key]}
            onChange={(event) => setValues((current) => ({ ...current, [category.key]: event.target.value }))}
            required
          />
        </label>
      ))}
      <p className={sumOk ? 'hint' : 'form-error'}>
        Suma: <strong>{sum.toFixed(2)}%</strong> {sumOk ? '✓' : '— debe ser exactamente 100%'}
      </p>
      <label>
        ¿Desde cuándo aplica?
        <select name="mode" defaultValue="hoy">
          <option value="hoy">Desde hoy (lo anterior se queda con los porcentajes de entonces)</option>
          <option value="todo">A todo el historial (recalcula lo ya registrado)</option>
        </select>
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton disabled={!sumOk} />
    </form>
  );
}

export default function PfPlanFormModal({ percents }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        Ajustar porcentajes
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>
              ×
            </button>
            <PlanForm percents={percents} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
