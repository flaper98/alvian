'use client';

import { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { editOwnMoneyAction } from '@/lib/actions';
import { CASH_PURPOSES } from '@/lib/cash-purposes';

// Fecha de Lima ('2026-11-08') para el campo de fecha.
const limaDate = (value) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Lima' }).format(
    new Date(value),
  );

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function EditOwnMoneyForm({ row, onClose }) {
  const [state, formAction] = useActionState(editOwnMoneyAction.bind(null, row.id), { error: null });
  const date = limaDate(row.t);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar «Puse dinero»</h2>
      <label>
        Monto (S/)
        <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" defaultValue={row.amount} required />
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={date} required />
      </label>
      <input type="hidden" name="originalDate" value={date} />
      <label>
        ¿Para qué?
        <select name="purpose" defaultValue={row.purpose || 'otro'}>
          {CASH_PURPOSES.aporte.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" maxLength={200} defaultValue={row.note || ''} />
      </label>
      <p className="hint">El cambio se refleja en la Caja, el Resumen y la Distribución.</p>
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

/** Ventana para corregir un «Puse dinero»: monto, fecha, para qué y nota. */
export default function EditOwnMoneyModal({ row, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditOwnMoneyForm row={row} onClose={onClose} />
      </div>
    </div>
  );
}
