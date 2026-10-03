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
import { installmentPlan } from '@/lib/loans.mjs';
import PaidWithField, { PaidWithBadge } from '../PaidWithField';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
// Las fechas límite y de cuotas son días ('YYYY-MM-DD'), sin hora: se muestran tal cual, sin zona horaria.
const dueFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const shortDueFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

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

const DEBT_KINDS = [
  { key: 'prestamo', label: 'Préstamo en cuotas', hint: 'Yape, banco, caja: cuota fija cada mes' },
  { key: 'simple', label: 'Deuda simple', hint: 'Un monto que pagas cuando puedas' },
];

/** Datos del préstamo tal como salen en la app (Yape, banco) y el resumen calculado al momento. */
function LoanFields({ debt }) {
  const [values, setValues] = useState({
    principal: debt?.principal ?? '',
    installments: debt?.installments ?? '',
    installmentAmount: debt?.installment_amount ?? '',
    firstDueDate: debt?.first_due_date ?? '',
  });
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const count = Number(values.installments);
  const cuota = Number(values.installmentAmount);
  const principal = Number(values.principal);
  const plan =
    Number.isInteger(count) && count >= 1 && count <= 120 && cuota > 0 && /^\d{4}-\d{2}-\d{2}$/.test(values.firstDueDate)
      ? installmentPlan({ installments: count, installmentAmount: cuota, firstDueDate: values.firstDueDate })
      : null;
  const interest = plan && principal > 0 ? Math.round((plan.total - principal) * 100) / 100 : null;

  return (
    <>
      <div className="loan-fields">
        <label>
          Te prestaron (S/)
          <input
            name="principal"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="Ej: 3400"
            value={values.principal}
            onChange={set('principal')}
            required
          />
        </label>
        <label>
          Número de cuotas
          <input
            name="installments"
            type="number"
            min="1"
            max="120"
            step="1"
            inputMode="numeric"
            placeholder="Ej: 6"
            value={values.installments}
            onChange={set('installments')}
            required
          />
        </label>
        <label>
          Cada cuota (S/)
          <input
            name="installmentAmount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="Ej: 680.53"
            value={values.installmentAmount}
            onChange={set('installmentAmount')}
            required
          />
        </label>
        <label>
          Primer cobro
          <input name="firstDueDate" type="date" value={values.firstDueDate} onChange={set('firstDueDate')} required />
        </label>
      </div>
      <div className="loan-preview" aria-live="polite">
        {plan ? (
          <>
            <div>
              <span>Devuelves en total</span>
              <strong>{soles(plan.total)}</strong>
            </div>
            <div>
              <span>Intereses</span>
              <strong className={interest != null && interest < 0 ? 'text-critical' : ''}>
                {interest == null
                  ? '—'
                  : `${soles(interest)}${interest >= 0 ? ` · ${(Math.round((interest / principal) * 1000) / 10).toLocaleString('es-PE')}%` : ''}`}
              </strong>
            </div>
            <div>
              <span>Última cuota</span>
              <strong>{dueFmt.format(new Date(plan.lastDueDate))}</strong>
            </div>
          </>
        ) : (
          <p className="hint">
            Copia los datos de tu app (Yape, banco): aquí verás cuánto devuelves en total, los intereses y cuándo
            terminas.
          </p>
        )}
      </div>
      {interest != null && interest < 0 ? (
        <p className="form-error">Las cuotas suman menos de lo que te prestaron: revisa el monto de la cuota.</p>
      ) : null}
    </>
  );
}

function SimpleDebtFields({ debt }) {
  return (
    <>
      <label>
        Monto total de la deuda (S/)
        <input name="total" type="number" min="0.01" step="0.01" defaultValue={debt?.total ?? ''} required />
      </label>
      <label>
        Fecha límite (opcional)
        <input name="dueDate" type="date" defaultValue={debt?.due_date || ''} />
      </label>
    </>
  );
}

function DebtForm({ debt, onClose }) {
  const action = debt ? updateDebtAction.bind(null, debt.id) : createDebtAction;
  const [state, formAction] = useActionState(action, { error: null });
  const [kind, setKind] = useState(debt && !debt.loan ? 'simple' : 'prestamo');
  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const isLoan = kind === 'prestamo';
  return (
    <form action={formAction} className="perfume-form">
      <h2>{debt ? 'Editar deuda' : 'Nueva deuda'}</h2>
      <div className="sale-payments debt-kinds" role="radiogroup" aria-label="Tipo de deuda">
        {DEBT_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            className={`sale-payment${kind === k.key ? ' active' : ''}`}
            onClick={() => setKind(k.key)}
          >
            <strong>{k.label}</strong>
            <small>{k.hint}</small>
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label>
        {isLoan ? '¿Quién te prestó?' : '¿A quién le debes?'}
        <input
          name="creditor"
          defaultValue={debt?.creditor || ''}
          placeholder={isLoan ? 'Ej: Yape – Crédito Negocio, BCP, Caja Piura' : 'Ej: Tío Fragancy, préstamo de mamá'}
          required
        />
      </label>
      {isLoan ? <LoanFields debt={debt} /> : <SimpleDebtFields debt={debt} />}
      <label>
        Detalle (opcional)
        <input name="description" defaultValue={debt?.description || ''} placeholder="Ej: para comprar mercadería" />
      </label>
      <label className="checkbox-field">
        <input name="fundsInvestment" type="checkbox" defaultChecked={debt ? Boolean(debt.funds_investment) : true} />
        Lo usé para invertir en el negocio
      </label>
      <p className="hint debt-invest-hint">
        Márcalo si ese dinero ya está en tus compras o en «Puse dinero». Así el Plan separa tu dinero del prestado, y
        las cuotas salen de lo que tienes para comprar (no de la Reserva).
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton label={debt ? 'Guardar cambios' : isLoan ? 'Registrar préstamo' : 'Registrar deuda'} />
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

  // En un préstamo se sugiere la próxima cuota; si su fecha ya pasó (Yape la
  // cobra solo), la fecha del pago es la del cobro.
  const loan = debt.loan?.nextNumber ? debt.loan : null;
  const today = todayInLima();
  const defaultDate = loan && loan.nextDueDate < today ? loan.nextDueDate : today;
  return (
    <form action={formAction} className="perfume-form">
      <h2>Pagar a {debt.creditor}</h2>
      <p className="hint">
        Saldo pendiente: {soles(debt.balance)}
        {loan ? ` · cuota ${loan.nextNumber} de ${debt.installments}` : ''}
      </p>
      <label>
        Monto del pago (S/)
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          max={debt.balance}
          defaultValue={loan ? loan.nextAmount : ''}
          required
        />
      </label>
      <label>
        Fecha
        <input name="date" type="date" defaultValue={defaultDate} required />
      </label>
      <PaidWithField defaultValue="ganancias" />
      <label>
        Nota (opcional)
        <input
          name="note"
          defaultValue={loan ? `Cuota ${loan.nextNumber} de ${debt.installments}` : ''}
          placeholder="Ej: cuota 3 de 6, Yape"
        />
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
  const loan = debt.loan;
  // En un préstamo lo que vence es la próxima cuota; en una deuda simple, la fecha límite.
  const nextDue = loan ? loan.nextDueDate : debt.due_date;
  const overdue = !settled && nextDue && nextDue < todayInLima();

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
        <div className="debt-badges">
          {debt.funds_investment ? <span className="badge badge-invest">Para invertir</span> : null}
          {settled ? (
            <span className="badge badge-paid">Pagada</span>
          ) : loan && overdue ? (
            <span className="badge badge-debt">Cuota {loan.nextNumber} vencida · {shortDueFmt.format(new Date(nextDue))}</span>
          ) : loan ? (
            <span className="badge badge-pending">Próxima cuota · {shortDueFmt.format(new Date(nextDue))}</span>
          ) : overdue ? (
            <span className="badge badge-debt">Vencida · {dueFmt.format(new Date(nextDue))}</span>
          ) : nextDue ? (
            <span className="badge badge-pending">Vence {dueFmt.format(new Date(nextDue))}</span>
          ) : null}
        </div>
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
      <p className="hint">
        {percent}% pagado
        {loan
          ? ` · ${loan.paidInstallments} de ${debt.installments} cuotas de ${soles(debt.installment_amount)} · última el ${dueFmt.format(new Date(loan.lastDueDate))}`
          : ''}
      </p>
      {loan && debt.principal ? (
        <p className="hint">
          Te prestaron {soles(debt.principal)} · pagas {soles(Math.max(debt.total - debt.principal, 0))} de intereses
        </p>
      ) : null}

      <div className="debt-actions">
        {!settled ? (
          <button type="button" className="btn-primary" onClick={() => setModal('pay')}>
            {loan?.nextNumber ? `Registrar cuota ${loan.nextNumber} · ${soles(loan.nextAmount)}` : 'Registrar pago'}
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
        <p className="hint">Usa «+ Nueva deuda» para anotar un préstamo en cuotas (Yape, banco) o algo que debas pagar en partes.</p>
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
