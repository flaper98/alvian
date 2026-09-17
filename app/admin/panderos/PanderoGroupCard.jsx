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

function EntryRow({ entry, perfumes }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function toggleFulfilled() {
    startTransition(async () => {
      await setPanderoEntryFulfilledAction(entry.id, !entry.fulfilled);
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
    <li className={`pandero-entry${entry.fulfilled ? ' pandero-entry-done' : ''}`}>
      <span className="pandero-entry-position">{entry.position}</span>
      <div className="pandero-entry-body">
        <strong>{entry.customer_name}</strong>
        <span> ({entry.perfume_name})</span>
        <p className="hint">Le toca: {formatDateOnly(entry.turn_date)}</p>
      </div>
      {editing ? (
        <EditPanderoEntryModal entry={entry} perfumes={perfumes} onClose={() => setEditing(false)} />
      ) : null}
      <span className={`badge ${entry.paying ? 'badge-paid' : 'badge-pending'}`}>
        <span className="badge-icon">
          {entry.paying ? <IconCheck size={12} /> : <IconClock size={12} />}
        </span>
        {entry.paying ? `Pagando (S/ ${PANDERO_CUOTA_AMOUNT.toFixed(2)})` : 'Sin pagar'}
      </span>
      <span className={`badge ${entry.fulfilled ? 'badge-paid' : 'badge-pending'}`}>
        <span className="badge-icon">
          {entry.fulfilled ? <IconCheck size={12} /> : <IconClock size={12} />}
        </span>
        {entry.fulfilled ? 'Entregado' : 'Pendiente'}
      </span>
      <div className="pandero-entry-actions">
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
      </div>
    </li>
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
        <ol className="pandero-entry-list">
          {group.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} perfumes={perfumes} />
          ))}
        </ol>
      )}

      <AddEntryForm groupId={group.id} perfumes={perfumes} />
    </div>
  );
}
