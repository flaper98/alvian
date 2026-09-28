'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerStockLossAction } from '@/lib/actions';
import { LOSS_REASONS } from '@/lib/loss-reasons';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar pérdida'}
    </button>
  );
}

function todayInLima() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function LossForm({ perfumes, onSaved }) {
  const [state, formAction] = useActionState(registerStockLossAction, { error: null });
  const [perfumeId, setPerfumeId] = useState('');
  const selected = perfumes.find((p) => String(p.id) === perfumeId);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar pérdida</h2>
      <label>
        Perfume
        <select name="perfumeId" value={perfumeId} onChange={(e) => setPerfumeId(e.target.value)} required>
          <option value="" disabled>
            Elige el perfume
          </option>
          {perfumes.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock < 1}>
              {p.name} (stock: {p.stock})
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          max={selected ? selected.stock : undefined}
          defaultValue={1}
          required
        />
      </label>
      <label>
        Motivo
        <select name="reason" defaultValue="" required>
          <option value="" disabled>
            Elige el motivo
          </option>
          {Object.entries(LOSS_REASONS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={todayInLima()} required />
      </label>
      <label>
        Nota (opcional)
        <input name="note" type="text" maxLength={300} placeholder="Ej: se cayó al empacar" />
      </label>
      <p className="hint">
        Se descuenta del stock y se valoriza al costo promedio de compra del perfume. Resta de tu
        ganancia; no es una salida de dinero nueva, porque ya lo pagaste al comprarlo.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}

export default function LossFormModal({ perfumes }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Registrar pérdida
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>
              ×
            </button>
            <LossForm perfumes={perfumes} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
