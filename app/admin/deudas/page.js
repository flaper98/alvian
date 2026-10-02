import { getCurrentRole } from '@/lib/session';
import { listDebts } from '@/lib/db';
import DebtsBoard, { NewDebtButton } from './DebtsBoard';

export const dynamic = 'force-dynamic';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Deudas</h1>
        <NewDebtButton />
      </div>
      <p className="hint">
        Anota cada deuda una vez (a quién y cuánto) y registra cada pago: el saldo baja solo. Los pagos
        cuentan como salida de dinero en el Resumen, en Reportes y en el Reparto («Pago de deuda»).
      </p>

      <div className="kpi-grid">
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
