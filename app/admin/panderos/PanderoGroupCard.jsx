'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addPanderoEntryAction,
  setPanderoEntryFulfilledAction,
  setPanderoEntryPayingAction,
  undoPanderoDeliveryAction,
  deletePanderoEntryAction,
  deletePanderoGroupAction,
} from '@/lib/actions';
import { PANDERO_CUOTA_AMOUNT } from '@/lib/pandero';
import EditPanderoEntryModal from './EditPanderoEntryModal';
import PanderoRoundPaymentsModal from './PanderoRoundPaymentsModal';

// start_date y turn_date son fechas puras (sin hora) que vienen de Postgres
// como medianoche UTC. Si se formatean con la zona horaria local del
// navegador (ej. Perú, UTC-5), se muestran un día antes. Forzamos UTC para
// que el calendario coincida con lo que se guardó.
function formatDateOnly(value) {
  return new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' });
}

const isoDay = (value) => new Date(value).toISOString().slice(0, 10);
const DAY_MS = 24 * 3600 * 1000;

/** "Hoy", "Mañana", "En 7 días" o "Hace 2 días". */
function relativeDay(iso, today) {
  const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days > 1) return `En ${days} días`;
  return `Hace ${-days} día${days === -1 ? '' : 's'}`;
}

function AddButton({ position }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Agregando...' : `Agregar como turno #${position}`}
    </button>
  );
}

function AddEntryForm({ groupId, perfumes, nextPosition }) {
  const boundAction = addPanderoEntryAction.bind(null, groupId);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="pandero-add">
      <label>
        Participante
        <input name="customerName" type="text" placeholder="Nombre del participante" required />
      </label>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue="">
          <option value="" disabled>
            Elige un perfume
          </option>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id}>
              {perfume.name} (stock {perfume.stock})
            </option>
          ))}
        </select>
      </label>
      <AddButton position={nextPosition} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

/** Menú "⋯" de cada turno: lo que se usa poco y no debe tocarse por error. */
function RowMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="pandero-menu" ref={ref}>
      <button type="button" className="pandero-menu-btn" aria-label="Más opciones" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        ⋯
      </button>
      {open ? (
        <ul role="menu">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                className={item.danger ? 'is-danger' : undefined}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EntryRow({ entry, perfumes, groupEntries, today, pendingByPerfume, canUndo }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const turnIso = isoDay(entry.turn_date);
  const isToday = !entry.fulfilled && turnIso <= today;
  const need = pendingByPerfume[entry.perfume_id]?.count || 0;
  const stock = Number(entry.perfume_stock);
  const short = !entry.fulfilled && need > stock;

  function deliver() {
    const ok = window.confirm(
      `¿Ya entregaste ${entry.perfume_name} a ${entry.customer_name}?\n\nSe descuenta 1 del stock, se registra la venta y se cierran los pagos de esta semana.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await setPanderoEntryFulfilledAction(entry.id, true);
      if (result?.error) alert(result.error);
    });
  }

  function undo() {
    const ok = window.confirm(
      `¿Deshacer la entrega a ${entry.customer_name}?\n\nEl perfume vuelve al stock, se borra la venta y quienes pagaron esa semana vuelven a «Pagando».`,
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await undoPanderoDeliveryAction(entry.id);
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

  const menu = [{ label: 'Editar', onClick: () => setEditing(true) }];
  if (entry.fulfilled) menu.unshift({ label: 'Ver pagos de esa semana', onClick: () => setShowPayments(true) });
  if (entry.round_recorded && canUndo) menu.push({ label: 'Deshacer entrega', onClick: undo });
  menu.push({ label: 'Quitar del pandero', onClick: handleDelete, danger: true });

  return (
    <li className={`pandero-row${entry.fulfilled ? ' is-done' : ''}${isPending ? ' is-busy' : ''}`}>
      <span className="pandero-turn">{entry.position}</span>
      <div className="pandero-who">
        <strong>
          {entry.customer_name}
          {isToday ? <span className="pandero-today">{turnIso < today ? 'Atrasado' : 'Toca hoy'}</span> : null}
        </strong>
        <span>{entry.perfume_name}</span>
        {!entry.fulfilled ? (
          <small className={short ? 'text-critical' : undefined}>
            Stock: {stock}
            {short ? ` · necesitas ${need}` : ''}
          </small>
        ) : null}
      </div>
      <div className="pandero-date">
        <small>{entry.fulfilled ? 'Le tocó' : 'Le toca'}</small>
        <strong>{formatDateOnly(entry.turn_date)}</strong>
        {!entry.fulfilled ? <small>{relativeDay(turnIso, today)}</small> : null}
      </div>
      <div className="pandero-actions">
        {/* Todos pagan su cuota cada semana, también los que ya recibieron su perfume. */}
        <button
          type="button"
          className={`pandero-pill${entry.paying ? ' is-ok' : ' is-wait'}`}
          onClick={togglePaying}
          disabled={isPending}
          title={entry.paying ? 'Tocar para marcar sin pagar' : 'Tocar cuando pague su cuota de esta semana'}
        >
          <i aria-hidden="true" />
          Cuota: <b>{entry.paying ? `Pagó S/ ${PANDERO_CUOTA_AMOUNT}` : 'Sin pagar'}</b>
        </button>
        {!entry.fulfilled ? (
          <button type="button" className="pandero-pill" onClick={deliver} disabled={isPending} title="Tocar cuando le entregues el perfume">
            <i aria-hidden="true" />
            Entrega: <b>Pendiente</b>
          </button>
        ) : (
          <span className="pandero-pill is-done">
            <i aria-hidden="true" />
            Entregado
          </span>
        )}
        <RowMenu items={menu} />
      </div>
      {editing ? (
        <EditPanderoEntryModal entry={entry} perfumes={perfumes} onClose={() => setEditing(false)} />
      ) : null}
      {showPayments ? (
        <PanderoRoundPaymentsModal entry={entry} groupEntries={groupEntries} onClose={() => setShowPayments(false)} />
      ) : null}
    </li>
  );
}

/**
 * Cuotas de la semana en curso: cuántos ya pagaron y quiénes faltan. Al marcar
 * la entrega del turno, esta lista se guarda (⋯ → Ver pagos) y empieza otra semana.
 */
function WeekPayments({ entries, next }) {
  const paid = entries.filter((e) => e.paying);
  const missing = entries.filter((e) => !e.paying);
  const expected = entries.length * PANDERO_CUOTA_AMOUNT;
  const collected = paid.length * PANDERO_CUOTA_AMOUNT;
  const complete = missing.length === 0;
  return (
    <div className={`pandero-week${complete ? ' is-complete' : ''}`}>
      <div className="pandero-week-head">
        <strong>
          Cuotas de esta semana · turno #{next.position} {next.customer_name}
        </strong>
        <span>
          Pagaron <b>{paid.length} de {entries.length}</b> · S/ {collected} de S/ {expected}
        </span>
      </div>
      <div className="pandero-progress" aria-hidden="true">
        <span style={{ width: `${entries.length ? (paid.length / entries.length) * 100 : 0}%` }} />
      </div>
      <p>
        {complete
          ? '¡Todos pagaron! Ya puedes entregar el perfume de esta semana.'
          : `Faltan: ${missing.map((e) => e.customer_name).join(', ')}`}
      </p>
    </div>
  );
}

export default function PanderoGroupCard({ group, perfumes, today, pendingByPerfume }) {
  const [isPending, startTransition] = useTransition();
  const entries = group.entries;
  const delivered = entries.filter((e) => e.fulfilled);
  const pendingEntries = entries.filter((e) => !e.fulfilled);
  const next = pendingEntries[0];
  const percent = entries.length ? Math.round((delivered.length / entries.length) * 100) : 0;
  // Solo se puede deshacer la última entrega registrada del grupo.
  const lastRecorded = Math.max(0, ...entries.filter((e) => e.round_recorded).map((e) => e.position));
  const nextPosition = Math.max(0, ...entries.map((e) => e.position)) + 1;

  function handleDeleteGroup() {
    if (!confirm(`¿Eliminar el pandero "${group.name}" y toda su lista?`)) return;
    startTransition(async () => {
      await deletePanderoGroupAction(group.id);
    });
  }

  const rowProps = (entry) => ({
    entry,
    perfumes,
    groupEntries: entries,
    today,
    pendingByPerfume,
    canUndo: entry.position === lastRecorded,
  });

  return (
    <div className="pandero-card">
      <div className="pandero-card-head">
        <div className="dist-head">
          <h2>{group.name}</h2>
          <span>
            Empieza el {formatDateOnly(group.start_date)} · cada {group.interval_days} día
            {group.interval_days === 1 ? '' : 's'}
          </span>
        </div>
        <div className="pandero-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="pandero-progress-meta">
          <span>
            {delivered.length} de {entries.length} entregados
          </span>
          <span>
            {next
              ? `Próximo turno: #${next.position} ${next.customer_name} · ${relativeDay(isoDay(next.turn_date), today).toLowerCase()}`
              : entries.length
                ? '¡Pandero completo!'
                : 'Sin participantes'}
          </span>
        </div>
      </div>

      {next ? <WeekPayments entries={entries} next={next} /> : null}

      {pendingEntries.length ? (
        <ul className="pandero-rows">
          {pendingEntries.map((entry) => (
            <EntryRow key={entry.id} {...rowProps(entry)} />
          ))}
        </ul>
      ) : null}

      {delivered.length ? (
        <details className="pandero-delivered" open={pendingEntries.length === 0}>
          <summary>Ya entregados ({delivered.length})</summary>
          <ul className="pandero-rows">
            {[...delivered].reverse().map((entry) => (
              <EntryRow key={entry.id} {...rowProps(entry)} />
            ))}
          </ul>
        </details>
      ) : null}

      <AddEntryForm groupId={group.id} perfumes={perfumes} nextPosition={nextPosition} />

      <div className="pandero-card-foot">
        <button type="button" className="btn-link-danger" onClick={handleDeleteGroup} disabled={isPending}>
          Eliminar pandero
        </button>
      </div>
    </div>
  );
}
