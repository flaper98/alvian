'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerCashMovementAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar'}
    </button>
  );
}

function todayInLima() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function CashMovementForm({ onSaved }) {
  const [state, formAction] = useActionState(registerCashMovementAction, { error: null });
  const [kind, setKind] = useState('aporte');

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar movimiento de caja</h2>
      <label>
        Tipo
        <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="aporte">Aporte: pongo dinero de mi bolsillo</option>
          <option value="retiro">Retiro: saco ganancia para mí</option>
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
        <input
          name="note"
          type="text"
          placeholder={kind === 'aporte' ? 'Ej: capital inicial, préstamo' : 'Ej: sueldo del mes'}
        />
      </label>
      <p className="hint">
        {kind === 'aporte'
          ? 'Dinero tuyo que entra al negocio (por ejemplo, para comprar stock). No es una venta.'
          : 'Dinero que sacas del negocio para ti. No es un gasto: sale de la ganancia.'}
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}

export default function CashMovementFormModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Aporte / retiro
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>
              ×
            </button>
            <CashMovementForm onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
