import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { listCashMovements, getCashFlow } from '@/lib/db';
import CashMovementFormModal from './CashMovementFormModal';
import CashMovementsList from './CashMovementsList';

export const dynamic = 'force-dynamic';

export default async function CajaPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let movements;
  let flow;
  try {
    [movements, flow] = await Promise.all([listCashMovements(), getCashFlow()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Caja</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Caja</h1>
        <CashMovementFormModal />
      </div>
      <p className="hint">
        Anota aquí el dinero que <strong>pones de tu bolsillo</strong> (aportes) y el que{' '}
        <strong>sacas para ti</strong> (retiros). Las ventas, compras, gastos y comisiones ya se
        cuentan solas desde sus secciones.
      </p>

      <div className="money-hero">
        <div className="money-hero-main">
          <span className="money-hero-label">Dinero en caja hoy</span>
          <strong className={`money-hero-value${flow.net < 0 ? ' text-critical' : ''}`}>
            S/ {flow.net.toFixed(2)}
          </strong>
          <span className="hint">
            Aportes S/ {flow.capitalIn.toFixed(2)} · Retiros S/ {flow.withdrawals.toFixed(2)} ·{' '}
            <Link href="/admin?periodo=todo">ver flujo completo →</Link>
          </span>
        </div>
      </div>
      {flow.net < 0 ? (
        <p className="form-error">
          La caja sale negativa: salió más dinero del que se registró como entrada. Probablemente falta
          anotar un aporte (por ejemplo, el capital con el que compraste el primer stock).
        </p>
      ) : null}

      <CashMovementsList movements={movements} />
    </section>
  );
}
