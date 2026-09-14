import { getCurrentRole } from '@/lib/session';
import { listCreditSales } from '@/lib/db';
import CreditosDashboard from './CreditosDashboard';

export const dynamic = 'force-dynamic';

function groupByCustomer(creditSales) {
  const groups = [];
  const indexByCustomer = new Map();

  for (const sale of creditSales) {
    const customerName = sale.customer_name || 'Sin nombre';
    if (!indexByCustomer.has(customerName)) {
      indexByCustomer.set(customerName, groups.length);
      groups.push({ customerName, sales: [], totalDebt: 0 });
    }
    const group = groups[indexByCustomer.get(customerName)];
    group.sales.push(sale);
    group.totalDebt += Number(sale.balance);
  }

  groups.sort((a, b) => b.totalDebt - a.totalDebt);
  return groups;
}

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

  const customerGroups = groupByCustomer(creditSales);

  return (
    <section className="admin-section">
      <h1>Crédito</h1>
      <CreditosDashboard customerGroups={customerGroups} />
    </section>
  );
}
