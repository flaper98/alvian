'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addPanderoEntryAction,
  setPanderoEntryFulfilledAction,
  setPanderoEntryPayingAction,
  deletePanderoEntryAction,
  deletePanderoGroupAction,
} from '@/lib/actions';
import { PANDERO_CUOTA_AMOUNT } from '@/lib/pandero';
import { IconCheck, IconClock } from '../icons';
import EditPanderoEntryModal from './EditPanderoEntryModal';
import PanderoRoundPaymentsModal from './PanderoRoundPaymentsModal';

// start_date y turn_date son fechas puras (sin hora) que vienen de Postgres
// como medianoche UTC. Si se formatean con la zona horaria local del
// navegador (ej. Perú, UTC-5), se muestran un día antes. Forzamos UTC para
// que el calendario coincida con lo que se guardó.
function formatDateOnly(value) {
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' });
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? 'Agregando...' : 'Agregar'}
    </button>
  );
}

function AddEntryForm({ groupId, perfumes }) {
  const boundAction = addPanderoEntryAction.bind(null, groupId);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="pandero-add-form">
      <input name="customerName" type="text" placeholder="Nombre del participante" required />
      <select name="perfumeId" required defaultValue="">
        <option value="" disabled>
          Perfume
        </option>
        {perfumes.map((perfume) => (
          <option key={perfume.id} value={perfume.id}>
            {perfume.name}
          </option>
        ))}
      </select>
      <AddButton />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

function EntryRow({ entry, perfumes, groupEntries }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const paymentsCount = (entry.round_payments || []).length;

  function toggleFulfilled() {
    startTransition(async () => {
      const result = await setPanderoEntryFulfilledAction(entry.id, !entry.fulfilled);
      if (result?.error) alert(result.error);
    });
  }

  function togglePaying() {
    startTransition(async () => {
      await setPanderoEntryPayingAction(entry.id, !entry.paying);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Quitar a "${entry.customer_name}" del pandero?`)) return;
    startTransition(async () => {
      await deletePanderoEntryAction(entry.id);
    });
  }

  return (
    <>
      <tr className={`perfume-table-row${entry.fulfilled ? ' pandero-row-done' : ''}`}>
        <td className="perfume-table-stock-cell">{entry.position}</td>
        <td>
          <strong>{entry.customer_name}</strong>
        </td>
        <td>
          <span className={`badge ${entry.paying ? 'badge-paid' : 'badge-pending'}`}>
            <span className="badge-icon">
              {entry.paying ? <IconCheck size={12} /> : <IconClock size={12} />}
            </span>
            {entry.paying ? `Pagando (S/ ${PANDERO_CUOTA_AMOUNT.toFixed(2)})` : 'Sin pagar'}
          </span>
        </td>
        <td>{entry.perfume_name}</td>
        <td>
          <span className={`badge ${entry.fulfilled ? 'badge-paid' : 'badge-pending'}`}>
            <span className="badge-icon">
              {entry.fulfilled ? <IconCheck size={12} /> : <IconClock size={12} />}
            </span>
            {entry.fulfilled ? 'Entregado' : 'Pendiente'}
          </span>
        </td>
        <td className="perfume-table-stock-cell">{formatDateOnly(entry.turn_date)}</td>
        <td className="perfume-table-actions-cell">
          {entry.fulfilled ? (
            <button type="button" className="btn-secondary" onClick={() => setShowPayments(true)}>
              {entry.round_recorded ? `Ver pagos (${paymentsCount})` : 'Ver pagos'}
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)} disabled={isPending}>
            Editar
          </button>
          <button type="button" className="btn-secondary" onClick={togglePaying} disabled={isPending}>
            {entry.paying ? 'Marcar sin pagar' : 'Marcar pagando'}
          </button>
          <button type="button" className="btn-secondary" onClick={toggleFulfilled} disabled={isPending}>
            {entry.fulfilled ? 'Marcar pendiente' : 'Marcar entregado'}
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            Quitar
          </button>
        </td>
      </tr>
      {editing ? (
        <EditPanderoEntryModal entry={entry} perfumes={perfumes} onClose={() => setEditing(false)} />
      ) : null}
      {showPayments ? (
        <PanderoRoundPaymentsModal
          entry={entry}
          groupEntries={groupEntries}
          onClose={() => setShowPayments(false)}
        />
      ) : null}
    </>
  );
}

export default function PanderoGroupCard({ group, perfumes }) {
  const [isPending, startTransition] = useTransition();

  function handleDeleteGroup() {
    if (!confirm(`¿Eliminar el pandero "${group.name}" y toda su lista?`)) return;
    startTransition(async () => {
      await deletePanderoGroupAction(group.id);
    });
  }

  return (
    <div className="pandero-group-card">
      <div className="pandero-group-header">
        <div>
          <h3>{group.name}</h3>
          <p className="hint">
            Empieza el {formatDateOnly(group.start_date)} · cada{' '}
            {group.interval_days} día{group.interval_days === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" className="btn-danger" onClick={handleDeleteGroup} disabled={isPending}>
          Eliminar pandero
        </button>
      </div>

      {group.entries.length === 0 ? (
        <p>Todavía no hay participantes.</p>
      ) : (
        <div className="perfume-table-wrap">
          <table className="perfume-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Participante</th>
                <th scope="col">Pagando</th>
                <th scope="col">Perfume</th>
                <th scope="col">Entregado</th>
                <th scope="col">Le toca</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} perfumes={perfumes} groupEntries={group.entries} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddEntryForm groupId={group.id} perfumes={perfumes} />
    </div>
  );
}
