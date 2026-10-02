import { getCurrentRole } from '@/lib/session';
import { listExpenses } from '@/lib/db';
import ExpenseFormModal from './ExpenseFormModal';
import ExpensesList from './ExpensesList';

export const dynamic = 'force-dynamic';

export default async function GastosPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let expenses;
  try {
    expenses = await listExpenses();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Gastos</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Gastos del negocio</h1>
        <ExpenseFormModal />
      </div>
      <p className="hint">
        Fletes, bolsas, publicidad, movilidad… Aquí ves cuánto gastas en cada cosa. Se restan de la
        Caja (también puedes registrarlos desde Caja → Registrar salida).
      </p>

      <ExpensesList expenses={expenses} />
    </section>
  );
}
