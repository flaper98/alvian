'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  registerCashMovementAction,
  registerExpenseAction,
  payAllCommissionsAction,
  payDebtFromCashAction,
  registerEnvelopeMovementAction,
} from '@/lib/actions';
import { CASH_PURPOSES } from '@/lib/cash-purposes';
import ExpenseFields from '../gastos/ExpenseFields';
import PaidWithField from '../PaidWithField';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-prices"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <div className="perfume-form cash-modal">{children}</div>
      </div>
    </div>
  );
}

/** Formulario genérico: cierra el modal cuando la acción termina bien. */
function ActionForm({ action, onDone, children, submitLabel }) {
  const [state, formAction] = useActionState(action, { error: null });
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="prices-form">
      {children}
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="prices-form-actions">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function AmountDateNote({ notePlaceholder, withDate = true }) {
  return (
    <>
      <div className="prices-form-row">
        <label>
          Monto (S/)
          <input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required autoFocus />
        </label>
        {withDate ? (
          <label>
            Fecha
            <input name="date" type="date" defaultValue={todayInLima()} required />
          </label>
        ) : null}
      </div>
      <label>
        Nota (opcional)
        <input name="note" placeholder={notePlaceholder} />
      </label>
    </>
  );
}

function PurposeField({ kind }) {
  return (
    <label>
      ¿Para qué?
      <select name="purpose" defaultValue="" required>
        <option value="" disabled>
          Elige una opción
        </option>
        {CASH_PURPOSES[kind].map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const OUT_TYPES = [
  { key: 'sueldo', icon: '👤', title: 'Saqué para mí', text: 'Tu sueldo, un gasto personal o ahorro' },
  { key: 'gasto', icon: '🧾', title: 'Gasto del negocio', text: 'Bolsas, publicidad, movilidad… (sale de la Reserva)' },
  { key: 'vendedora', icon: '🤝', title: 'Pago a la vendedora', text: 'Su comisión por las ventas' },
  { key: 'deuda', icon: '📉', title: 'Pago de una deuda', text: 'Cuota o abono de algo que debes' },
  { key: 'compra', icon: '🛍️', title: 'Compra de perfumes', text: 'Mercadería para vender' },
  { key: 'impuestos', icon: '🏛️', title: 'Pagué impuestos', text: 'SUNAT: sale del sobre Impuestos' },
  { key: 'reserva', icon: '🛟', title: 'Usé la reserva', text: 'Un imprevisto: sale del sobre Reserva' },
];

function OutflowForms({ type, commissionDue, debts, onDone }) {
  if (type === 'sueldo') {
    return (
      <ActionForm action={registerCashMovementAction} onDone={onDone} submitLabel="Registrar salida">
        <input type="hidden" name="kind" value="retiro" />
        <PurposeField kind="retiro" />
        <AmountDateNote notePlaceholder="Ej: sueldo de la quincena" />
      </ActionForm>
    );
  }
  if (type === 'gasto') {
    return (
      <ActionForm action={registerExpenseAction} onDone={onDone} submitLabel="Registrar gasto">
        <ExpenseFields />
        <PaidWithField />
        <AmountDateNote notePlaceholder="Ej: 3 envíos a Lima" withDate={false} />
      </ActionForm>
    );
  }
  if (type === 'vendedora') return <PayCommission due={commissionDue} onDone={onDone} />;
  if (type === 'impuestos' || type === 'reserva') {
    return (
      <ActionForm action={registerEnvelopeMovementAction} onDone={onDone} submitLabel="Registrar salida">
        <input type="hidden" name="envelope" value={type} />
        <AmountDateNote
          notePlaceholder={type === 'impuestos' ? 'Ej: pago SUNAT de setiembre' : '¿En qué la usaste? (obligatorio)'}
        />
      </ActionForm>
    );
  }
  if (type === 'deuda') {
    const open = debts.filter((d) => d.balance > 0);
    if (open.length === 0) {
      return (
        <p className="hint">
          No tienes deudas por pagar registradas. <Link href="/admin/deudas">Registra la deuda primero →</Link>
        </p>
      );
    }
    return (
      <ActionForm action={payDebtFromCashAction} onDone={onDone} submitLabel="Registrar pago">
        <DebtPaymentFields debts={open} />
      </ActionForm>
    );
  }
  return (
    <div className="cash-info">
      <p>
        Las compras de perfumes se registran en <strong>Compras</strong>, porque además suman las
        unidades a tu stock y calculan el costo. Ahí mismo cuentan como salida de la caja.
      </p>
      <Link href="/admin/compras" className="btn-primary">
        Ir a registrar la compra →
      </Link>
    </div>
  );
}

/** Deuda a pagar; si es un préstamo en cuotas, el monto y la nota de la próxima cuota vienen llenos. */
function DebtPaymentFields({ debts }) {
  const initial = debts.length === 1 ? String(debts[0].id) : '';
  const [debtId, setDebtId] = useState(initial);
  const debt = debts.find((d) => String(d.id) === debtId);
  const loan = debt?.loan?.nextNumber ? debt.loan : null;
  return (
    <>
      <label>
        ¿Qué deuda pagaste?
        <select name="debtId" defaultValue={initial} onChange={(event) => setDebtId(event.target.value)} required>
          <option value="" disabled>
            Elige la deuda
          </option>
          {debts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.creditor}
              {d.loan?.nextNumber ? ` · cuota ${d.loan.nextNumber} de ${d.installments}` : ''} · te falta {soles(d.balance)}
            </option>
          ))}
        </select>
      </label>
      <PaidWithField />
      {/* key: al cambiar de deuda se vuelven a llenar monto y nota. */}
      <div className="prices-form-row" key={`amount-${debtId}`}>
        <label>
          Monto (S/)
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            defaultValue={loan ? loan.nextAmount : ''}
            required
          />
        </label>
        <label>
          Fecha
          <input name="date" type="date" defaultValue={todayInLima()} required />
        </label>
      </div>
      <label key={`note-${debtId}`}>
        Nota (opcional)
        <input
          name="note"
          defaultValue={loan ? `Cuota ${loan.nextNumber} de ${debt.installments}` : ''}
          placeholder="Ej: cuota 3 de 6"
        />
      </label>
    </>
  );
}

function PayCommission({ due, onDone }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  if (due <= 0) {
    return (
      <div className="cash-info">
        <p>
          No le debes nada a la vendedora por ahora. Su comisión se libera cuando el cliente paga la
          venta.
        </p>
        <Link href="/admin/comisiones">Ver comisiones por venta →</Link>
      </div>
    );
  }
  return (
    <div className="cash-info">
      <p>
        Comisión que ya puedes pagarle: <strong>{soles(due)}</strong>
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await payAllCommissionsAction();
            if (result?.error) setMessage(result.error);
            else onDone();
          })
        }
      >
        {isPending ? 'Guardando…' : `Le pagué ${soles(due)}`}
      </button>
      {message ? <p className="form-error">{message}</p> : null}
      <Link href="/admin/comisiones">Prefiero pagar venta por venta →</Link>
    </div>
  );
}

export default function CajaActions({ commissionDue, debts }) {
  const [modal, setModal] = useState(null);
  const [type, setType] = useState(null);
  const close = () => {
    setModal(null);
    setType(null);
  };

  return (
    <>
      <div className="cash-buttons">
        <button type="button" className="cash-btn cash-btn-out" onClick={() => setModal('out')}>
          <span aria-hidden="true">−</span> Registrar salida
        </button>
        <button type="button" className="cash-btn cash-btn-in" onClick={() => setModal('in')}>
          <span aria-hidden="true">+</span> Puse dinero
        </button>
      </div>

      {modal === 'in' ? (
        <Modal title="Puse dinero" onClose={close}>
          <div>
            <h2>Puse dinero en la caja</h2>
            <p className="hint">Dinero tuyo (de tu bolsillo) que entra al negocio. No cuenta como venta.</p>
          </div>
          <ActionForm action={registerCashMovementAction} onDone={close} submitLabel="Registrar">
            <input type="hidden" name="kind" value="aporte" />
            <PurposeField kind="aporte" />
            <AmountDateNote notePlaceholder="Ej: para el pedido de Tío Fragancy" />
          </ActionForm>
        </Modal>
      ) : null}

      {modal === 'out' ? (
        <Modal title="Registrar salida" onClose={close}>
          <div>
            <h2>{type ? OUT_TYPES.find((t) => t.key === type).title : '¿Para qué salió el dinero?'}</h2>
            {type ? (
              <button type="button" className="btn-link-back" onClick={() => setType(null)}>
                ← Elegir otro tipo
              </button>
            ) : null}
          </div>
          {type ? (
            <OutflowForms type={type} commissionDue={commissionDue} debts={debts} onDone={close} />
          ) : (
            <div className="cash-types">
              {OUT_TYPES.map((t) => (
                <button key={t.key} type="button" className="cash-type" onClick={() => setType(t.key)}>
                  <span className="cash-type-icon" aria-hidden="true">
                    {t.icon}
                  </span>
                  <span>
                    <strong>{t.title}</strong>
                    <small>{t.text}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}
