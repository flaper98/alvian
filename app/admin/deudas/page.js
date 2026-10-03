import { getCurrentRole } from '@/lib/session';
import { listDebts } from '@/lib/db';
import DebtsBoard, { NewDebtButton } from './DebtsBoard';

export const dynamic = 'force-dynamic';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Fechas de cuotas: días 'YYYY-MM-DD' sin hora, se muestran tal cual.
const dueFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function DeudasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let debts;
  try {
    debts = await listDebts();
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

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Deudas</h1>
        <NewDebtButton />
      </div>
      <p className="hint">
        Anota cada deuda una vez y registra cada pago: el saldo baja solo. Para un préstamo (Yape, banco) elige
        «Préstamo en cuotas» y copia lo que dice tu app: el sistema calcula el total, los intereses y cuándo
        terminas. Los pagos salen de la Caja (también puedes registrarlos desde Caja → Registrar salida).
      </p>

      <div className="kpi-grid">
        {nextLoan ? (
          <div className={`kpi-tile${nextLoan.loan.nextDueDate < today ? ' kpi-tile-bad' : ''}`}>
            <span className="kpi-label">{nextLoan.loan.nextDueDate < today ? 'Cuota vencida' : 'Próxima cuota'}</span>
            <strong className="kpi-value">{soles(nextLoan.loan.nextAmount)}</strong>
            <span className="kpi-sub">
              {dueFmt.format(new Date(nextLoan.loan.nextDueDate))} · cuota {nextLoan.loan.nextNumber} de{' '}
              {nextLoan.installments} · {nextLoan.creditor}
            </span>
          </div>
        ) : null}
        <div className={`kpi-tile${owed > 0 ? ' kpi-tile-bad' : ' kpi-tile-good'}`}>
          <span className="kpi-label">Debes en total</span>
          <strong className="kpi-value">{soles(owed)}</strong>
          <span className="kpi-sub">
            {activeCount} deuda{activeCount === 1 ? '' : 's'} por pagar
          </span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Ya pagaste</span>
          <strong className="kpi-value">{soles(paid)}</strong>
          <span className="kpi-sub">Desde que registraste tus deudas</span>
        </div>
      </div>

      <DebtsBoard debts={debts} />
    </section>
  );
}
