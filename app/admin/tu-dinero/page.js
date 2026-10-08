import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { listDebts, listOwnMoney } from '@/lib/db';
import OwnMoneyBoard from './OwnMoneyBoard';

export const dynamic = 'force-dynamic';

export default async function TuDineroPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let rows;
  let debts;
  try {
    [rows, debts] = await Promise.all([listOwnMoney(), listDebts()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Tu dinero</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }
  // Préstamos con los que invertiste: su dinero está dentro de lo que pusiste, pero no es tuyo.
  const borrowed = debts
    .filter((d) => d.funds_investment)
    .reduce((sum, d) => sum + Number(d.principal ?? d.total), 0);

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Tu dinero</h1>
      </div>
      <p className="hint">
        Todo lo que pusiste de tu bolsillo en el negocio, movimiento por movimiento: cada «Puse dinero» de la Caja y
        las compras, gastos y pagos de deuda marcados «De tu bolsillo». Es lo que suma «Pusiste tú» en el Resumen y en
        la Caja. Para corregir algo, edítalo o bórralo en su sección (<Link href="/admin/compras">Compras</Link>,{' '}
        <Link href="/admin/gastos">Gastos</Link>, <Link href="/admin/deudas">Deudas</Link> o{' '}
        <Link href="/admin/caja">Caja</Link>).
      </p>
      <OwnMoneyBoard rows={rows} borrowed={Math.round(borrowed * 100) / 100} />
    </section>
  );
}
