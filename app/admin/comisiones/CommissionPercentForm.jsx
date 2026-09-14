'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { setCommissionPercentAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar'}
    </button>
  );
}

export default function CommissionPercentForm({ percent }) {
  const [state, formAction] = useActionState(setCommissionPercentAction, { error: null });

  return (
    <form action={formAction} className="perfume-form">
      <h2>Comisión por venta</h2>
      <label>
        Porcentaje sobre cada venta de la vendedora (%)
        <input
          name="percent"
          type="number"
          min="0"
          max="100"
          step="0.1"
          defaultValue={percent}
          required
        />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
      <p className="hint">
        Se calcula solo en cada venta nueva que registre la vendedora. Si cambias el porcentaje,
        también se actualizan las comisiones que todavía no se han pagado (las ya pagadas no se
        tocan).
      </p>
    </form>
  );
}
