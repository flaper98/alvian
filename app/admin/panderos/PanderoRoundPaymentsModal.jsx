'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { setPanderoRoundPayersAction } from '@/lib/actions';
import { PANDERO_CUOTA_AMOUNT } from '@/lib/pandero';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Guardar cambios'}
    </button>
  );
}

function RoundPaymentsForm({ entry, groupEntries, onClose }) {
  const boundAction = setPanderoRoundPayersAction.bind(null, entry.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  const payments = entry.round_payments || [];
  const removedPayers = payments.filter((payment) => payment.payer_entry_id == null);
  const [checkedIds, setCheckedIds] = useState(() =>
    payments.filter((payment) => payment.payer_entry_id != null).map((payment) => payment.payer_entry_id),
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  function toggle(id) {
    setCheckedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  const payersCount = checkedIds.length + removedPayers.length;
  const total = payersCount * PANDERO_CUOTA_AMOUNT;

  return (
    <form action={formAction} className="perfume-form">
      <h2>Pagos del número {entry.position}</h2>
      <p className="hint">
        Le tocó a <strong>{entry.customer_name}</strong> ({entry.perfume_name}). Marca quiénes pagaron su
        cuota de S/ {PANDERO_CUOTA_AMOUNT.toFixed(2)} en este número.
      </p>
      {!entry.round_recorded ? (
        <p className="hint">
          Este número se entregó antes de que existiera el historial, por eso no hay quiénes pagaron
          guardado. Marca a los que pagaron y guarda: lo que ya estaba sumado en el Resumen no se duplica.
        </p>
      ) : null}

      <div className="round-payers-list">
        {groupEntries.map((participant) => (
          <label key={participant.id} className="checkbox-field">
            <input
              type="checkbox"
              name="payerId"
              value={participant.id}
              checked={checkedIds.includes(participant.id)}
              onChange={() => toggle(participant.id)}
            />
            <span>
              {participant.position}. {participant.customer_name}
            </span>
          </label>
        ))}
        {removedPayers.map((payment, index) => (
          <p key={`removed-${index}`} className="hint">
            ✓ {payment.payer_name} (ya no está en la lista)
          </p>
        ))}
      </div>

      <p>
        <strong>{payersCount}</strong> pagaron · Total cobrado en este número:{' '}
        <strong>S/ {total.toFixed(2)}</strong>
      </p>
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

export default function PanderoRoundPaymentsModal({ entry, groupEntries, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <RoundPaymentsForm entry={entry} groupEntries={groupEntries} onClose={onClose} />
      </div>
    </div>
  );
}
