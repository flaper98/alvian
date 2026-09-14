import { getCurrentRole } from '@/lib/session';
import { listCreditSales } from '@/lib/db';
import CreditSaleRow from './CreditSaleRow';

export const dynamic = 'force-dynamic';

export default async function CreditosPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let creditSales;
  try {
    creditSales = await listCreditSales();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Crédito / Pandero</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Crédito / Pandero</h1>
      {creditSales.length === 0 ? (
        <p>No hay ventas a crédito registradas.</p>
      ) : (
        <ul className="history-list">
          {creditSales.map((sale) => (
            <CreditSaleRow key={sale.id} sale={sale} />
          ))}
        </ul>
      )}
    </section>
  );
}
