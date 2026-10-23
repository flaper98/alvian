import { getCurrentRole } from '@/lib/session';
import { getCashFlow, listDebts } from '@/lib/db';
import { daysBetween } from '@/lib/loans.mjs';
import DebtsBoard, { NewDebtButton, PayDebtButton } from './DebtsBoard';

export const dynamic = 'force-dynamic';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Fechas de cuotas: días 'YYYY-MM-DD' sin hora, se muestran tal cual.
const dueFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "Vence hoy", "Vence en 5 días" o "Vencida hace 2 días". */
function dueText(days) {
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days > 1) return `Vence en ${days} días`;
  return `Vencida hace ${-days} día${days === -1 ? '' : 's'}`;
}

export default async function DeudasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let debts;
  let cash;
  try {
    [debts, cash] = await Promise.all([listDebts(), getCashFlow()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Deudas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const owed = debts.reduce((sum, d) => sum + d.balance, 0);
  const paid = debts.reduce((sum, d) => sum + d.paid, 0);
  const activeCount = debts.filter((d) => d.balance > 0).length;
  // La cuota más próxima de los préstamos que siguen activos.
  const nextLoan = debts
    .filter((d) => d.loan?.nextDueDate)
    .sort((a, b) => a.loan.nextDueDate.localeCompare(b.loan.nextDueDate))[0];
  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const days = nextLoan ? daysBetween(today, nextLoan.loan.nextDueDate) : null;
  const inCash = Math.max(Number(cash.net) || 0, 0);
  const missing = nextLoan ? Math.max(nextLoan.loan.nextAmount - inCash, 0) : 0;

  return (
    <section className="admin-section debts-page">
      <div className="admin-header">
        <div>
          <h1>Deudas</h1>
          <p className="dist-lead">Anota cada deuda una vez y registra cada pago: el saldo baja solo.</p>
        </div>
        <NewDebtButton />
      </div>

      <div className="debts-top">
        {nextLoan ? (
          <div className={`debts-hero${days < 0 ? ' is-overdue' : ''}`}>
            <div className="debts-hero-head">
              <span className="dist-eyebrow">{days < 0 ? 'Cuota vencida' : 'Próxima cuota'}</span>
              <span className={`debts-hero-pill${days < 0 ? ' is-overdue' : ''}`}>
                {dueText(days)} · {dueFmt.format(new Date(`${nextLoan.loan.nextDueDate}T12:00:00Z`))}
              </span>
            </div>
            <strong className="debts-hero-amount">{soles(nextLoan.loan.nextAmount)}</strong>
            <span className="debts-hero-sub">
              {nextLoan.creditor} · cuota {nextLoan.loan.nextNumber} de {nextLoan.installments}
            </span>
            <div className="debts-hero-foot">
              <p>
                Hoy tienes <strong>{soles(cash.net)}</strong> en caja ·{' '}
                {missing > 0 ? (
                  <>
                    te faltan <strong>{soles(missing)}</strong> para esta cuota.
                  </>
                ) : (
                  <>alcanza para pagar esta cuota.</>
                )}
              </p>
              <PayDebtButton debt={nextLoan} className="debts-hero-btn" label={`Registrar cuota ${nextLoan.loan.nextNumber}`} />
            </div>
          </div>
        ) : (
          <div className="debts-hero is-clear">
            <span className="dist-eyebrow">Próxima cuota</span>
            <strong className="debts-hero-amount">Sin cuotas</strong>
            <span className="debts-hero-sub">No tienes préstamos en cuotas pendientes.</span>
          </div>
        )}
        <div className="debts-side">
          <div className="dist-card dist-kpi">
            <span className="dist-eyebrow">Debes en total</span>
            <strong className={owed > 0 ? 'text-critical' : 'text-good'}>{soles(owed)}</strong>
            <small>
              {activeCount} deuda{activeCount === 1 ? '' : 's'} por pagar
            </small>
          </div>
          <div className="dist-card dist-kpi">
            <span className="dist-eyebrow">Ya pagaste</span>
            <strong>{soles(paid)}</strong>
            <small>Desde que registraste tus deudas</small>
          </div>
        </div>
      </div>

      <DebtsBoard debts={debts} />

      <details className="dist-card debts-help">
        <summary>¿Cómo registro un préstamo?</summary>
        <p>
          Toca «+ Nueva deuda» y elige «Préstamo en cuotas». Copia lo que dice tu app (Yape, banco): cuánto te
          prestaron, el número de cuotas, cuánto es cada cuota y la fecha del primer cobro. El sistema calcula el
          total, los intereses y cuándo terminas.
        </p>
        <p>
          Cada vez que pagues, toca «Registrar cuota». El pago sale de la Caja (también puedes registrarlo desde Caja →
          Registrar salida).
        </p>
      </details>
    </section>
  );
}
