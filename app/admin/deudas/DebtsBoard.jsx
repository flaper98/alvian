'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createDebtAction,
  updateDebtAction,
  deleteDebtAction,
  addDebtPaymentAction,
  deleteDebtPaymentAction,
} from '@/lib/actions';
import PaidWithField, { PaidWithBadge } from '../PaidWithField';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
// Las fechas límite son días (DATE), sin hora: se muestran tal cual, sin zona horaria.
const dueFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

function todayInLima() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

function SubmitButton({ label }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : label}
    </button>
  );
}

function Modal({ onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

function DebtForm({ debt, onClose }) {
  const action = debt ? updateDebtAction.bind(null, debt.id) : createDebtAction;
  const [state, formAction] = useActionState(action, { error: null });
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const dueDefault = debt?.due_date ? new Date(debt.due_date).toISOString().slice(0, 10) : '';
  return (
    <form action={formAction} className="perfume-form">
      <h2>{debt ? 'Editar deuda' : 'Nueva deuda'}</h2>
      <label>
        ¿A quién le debes?
        <input name="creditor" defaultValue={debt?.creditor || ''} placeholder="Ej: Banco, Tío Fragancy, préstamo de mamá" required />
      </label>
      <label>
        Monto total de la deuda (S/)
        <input name="total" type="number" min="0.01" step="0.01" defaultValue={debt?.total ?? ''} required />
      </label>
      <label>
        Detalle (opcional)
        <input name="description" defaultValue={debt?.description || ''} placeholder="Ej: préstamo para comprar mercadería" />
      </label>
      <label>
        Fecha límite (opcional)
        <input name="dueDate" type="date" defaultValue={dueDefault} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton label={debt ? 'Guardar cambios' : 'Registrar deuda'} />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function PaymentForm({ debt, onClose }) {
  const [state, formAction] = useActionState(addDebtPaymentAction.bind(null, debt.id), { error: null });
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Pagar a {debt.creditor}</h2>
      <p className="hint">Saldo pendiente: {soles(debt.balance)}</p>
      <label>
        Monto del pago (S/)
        <input name="amount" type="number" min="0.01" step="0.01" max={debt.balance} required />
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={todayInLima()} required />
      </label>
      <PaidWithField defaultValue="ganancias" />
      <label>
        Nota (opcional)
        <input name="note" placeholder="Ej: cuota 3 de 6, Yape" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton label="Registrar pago" />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DebtCard({ debt }) {
  const [modal, setModal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const percent = debt.total > 0 ? Math.min(100, Math.round((debt.paid / debt.total) * 100)) : 0;
  const settled = debt.balance <= 0;
  const overdue = !settled && debt.due_date && new Date(debt.due_date) < new Date(todayInLima());

  function run(action, id, confirmText) {
    if (!window.confirm(confirmText)) return;
    setError('');
    startTransition(async () => {
      const result = await action(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <li className={`debt-card${settled ? ' is-settled' : ''}`}>
      <div className="debt-card-head">
        <div>
          <h3>{debt.creditor}</h3>
          {debt.description ? <p className="hint">{debt.description}</p> : null}
        </div>
        {settled ? (
          <span className="badge badge-paid">Pagada</span>
        ) : overdue ? (
          <span className="badge badge-debt">Vencida · {dueFmt.format(new Date(debt.due_date))}</span>
        ) : debt.due_date ? (
          <span className="badge badge-pending">Vence {dueFmt.format(new Date(debt.due_date))}</span>
        ) : null}
      </div>

      <div className="debt-amounts">
        <div>
          <span>Debes</span>
          <strong className={settled ? '' : 'text-critical'}>{soles(debt.balance)}</strong>
        </div>
        <div>
          <span>Pagado</span>
          <strong>{soles(debt.paid)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{soles(debt.total)}</strong>
        </div>
      </div>
      <div
        className="debt-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Pagado ${percent}%`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="hint">{percent}% pagado</p>

      <div className="debt-actions">
        {!settled ? (
          <button type="button" className="btn-primary" onClick={() => setModal('pay')}>
            Registrar pago
          </button>
        ) : null}
        {debt.payments.length ? (
          <button type="button" className="btn-secondary" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}>
            {showHistory ? 'Ocultar pagos' : `Ver pagos (${debt.payments.length})`}
          </button>
        ) : null}
        <button type="button" className="btn-secondary" onClick={() => setModal('edit')}>
          Editar
        </button>
        <button
          type="button"
          className="btn-link-danger"
          disabled={isPending}
          onClick={() =>
            run(deleteDebtAction, debt.id, `¿Eliminar la deuda con ${debt.creditor}? También se borran sus ${debt.payments.length} pagos.`)
          }
        >
          Eliminar
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}

      {showHistory ? (
        <ul className="debt-history">
          {debt.payments.map((p) => (
            <li key={p.id}>
              <span>{dateFmt.format(new Date(p.paid_at))}</span>
              <strong>{soles(p.amount)}</strong>
              <PaidWithBadge value={p.paid_with} />
              {p.note ? <span className="hint">{p.note}</span> : null}
              <button
                type="button"
                className="pivot-remove"
                aria-label={`Quitar pago de ${soles(p.amount)}`}
                title="Quitar este pago"
                disabled={isPending}
                onClick={() => run(deleteDebtPaymentAction, p.id, `¿Quitar el pago de ${soles(p.amount)}?`)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {modal === 'pay' ? (
        <Modal onClose={() => setModal(null)}>
          <PaymentForm debt={debt} onClose={() => setModal(null)} />
        </Modal>
      ) : null}
      {modal === 'edit' ? (
        <Modal onClose={() => setModal(null)}>
          <DebtForm debt={debt} onClose={() => setModal(null)} />
        </Modal>
      ) : null}
    </li>
  );
}

export function NewDebtButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nueva deuda
      </button>
      {open ? (
        <Modal onClose={() => setOpen(false)}>
          <DebtForm onClose={() => setOpen(false)} />
        </Modal>
      ) : null}
    </>
  );
}

export default function DebtsBoard({ debts }) {
  const [filter, setFilter] = useState('active');
  const active = debts.filter((d) => d.balance > 0);
  const settled = debts.filter((d) => d.balance <= 0);
  const visible = filter === 'active' ? active : filter === 'settled' ? settled : debts;

  if (debts.length === 0) {
    return (
      <div className="empty-state">
        <p>No tienes deudas registradas.</p>
        <p className="hint">Usa «+ Nueva deuda» para anotar un préstamo o algo que debas pagar en partes.</p>
      </div>
    );
  }

  return (
    <>
      <div className="filter-chips" role="group" aria-label="Filtrar deudas">
        {[
          ['active', 'Por pagar', active.length],
          ['settled', 'Pagadas', settled.length],
          ['all', 'Todas', debts.length],
        ].map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className={`filter-chip${filter === key ? ' active' : ''}`}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label} <span className="filter-chip-count">{count}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="hint">{filter === 'active' ? '¡No debes nada! 🎉' : 'No hay deudas en esta vista.'}</p>
      ) : (
        <ul className="debt-list">
          {visible.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
        </ul>
      )}
    </>
  );
}
