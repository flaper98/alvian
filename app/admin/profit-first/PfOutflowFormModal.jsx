'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerPfOutflowAction } from '@/lib/actions';
import { PF_CATEGORIES, PF_MANUAL_OUTFLOW_CATEGORIES } from '@/lib/profit-first';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar salida'}
    </button>
  );
}

function todayInLima() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function OutflowForm({ onSaved }) {
  const [state, formAction] = useActionState(registerPfOutflowAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar salida de una categoría</h2>
      <label>
        Categoría
        <select name="category" defaultValue="impuestos">
          {PF_CATEGORIES.filter((c) => PF_MANUAL_OUTFLOW_CATEGORIES.includes(c.key)).map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto (S/)
        <input name="amount" type="number" min="0.01" step="0.01" required />
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={todayInLima()} required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: pago de IGV, cuota del préstamo" />
      </label>
      <p className="hint">
        Tu sueldo sale de <strong>Retiros</strong> y los gastos operativos de <strong>Gastos</strong> y{' '}
        <strong>Comisiones</strong>: no los anotes aquí, ya se descuentan solos.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}

export default function PfOutflowFormModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Registrar salida
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>
              ×
            </button>
            <OutflowForm onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
