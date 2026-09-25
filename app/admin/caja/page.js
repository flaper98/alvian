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
        Anota aquí el dinero que <strong>sacas para ti</strong> (retiros) y, si alguna vez dejas
        efectivo tuyo en el negocio sin usarlo en una compra o gasto, regístralo como aporte. Las
        compras y gastos pagados con tu capital se marcan en su propia sección, no aquí.
      </p>

      <div className="money-hero">
        <div className="money-hero-main">
          <span className="money-hero-label">Ganancias disponibles hoy</span>
          <strong className={`money-hero-value${flow.net < 0 ? ' text-critical' : ''}`}>
            S/ {flow.net.toFixed(2)}
          </strong>
          <span className="hint">
            Lo que entró, menos lo reinvertido, gastos con ganancias, comisiones y retiros ·{' '}
            <Link href="/admin?periodo=todo">ver detalle →</Link>
          </span>
        </div>
      </div>
      {flow.net < 0 ? (
        <p className="form-error">
          Sale negativo: se registró más reinversión de la que entró. Revisa en Compras y Gastos si
          algo marcado como &quot;Reinversión&quot; en realidad lo pagaste con tu capital.
        </p>
      ) : null}

      <CashMovementsList movements={movements} />
    </section>
  );
}
