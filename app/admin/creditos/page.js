import { getCurrentRole } from '@/lib/session';
import { listCreditSales } from '@/lib/db';
import CreditosDashboard from './CreditosDashboard';

export const dynamic = 'force-dynamic';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  // Dentro de cada cliente, primero lo que todavía debe.
  for (const group of groups) {
    group.totalDebt = Math.round(group.totalDebt * 100) / 100;
    group.sales.sort((a, b) => Number(Number(b.balance) > 0) - Number(Number(a.balance) > 0));
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
        <h1>Por cobrar</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const customerGroups = groupByCustomer(creditSales);
  const withDebt = customerGroups.filter((g) => g.totalDebt > 0);
  const total = withDebt.reduce((sum, g) => sum + g.totalDebt, 0);
  const top = withDebt[0];

  return (
    <section className="admin-section credits-page">
      <div className="admin-header">
        <div>
          <h1>Por cobrar</h1>
          <p className="dist-lead">Lo que tus clientes todavía te deben. Registra cada abono cuando te paguen.</p>
        </div>
      </div>

      <div className="credits-kpis">
        <div className="dist-card dist-kpi is-dark">
          <span className="dist-eyebrow">Total por cobrar</span>
          <strong>{soles(total)}</strong>
          <small>
            Suma de los {withDebt.length} cliente{withDebt.length === 1 ? '' : 's'} con deuda
          </small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Mayor deuda</span>
          <strong className={top ? 'text-critical' : ''}>{top ? soles(top.totalDebt) : '—'}</strong>
          <small>{top ? top.customerName : 'Nadie te debe'}</small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Con deuda</span>
          <strong>
            {withDebt.length} cliente{withDebt.length === 1 ? '' : 's'}
          </strong>
          <small>De {customerGroups.length} en total</small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Al día</span>
          <strong className="text-good">
            {customerGroups.length - withDebt.length} cliente{customerGroups.length - withDebt.length === 1 ? '' : 's'}
          </strong>
          <small>Ya pagaron todo</small>
        </div>
      </div>

      <CreditosDashboard customerGroups={customerGroups} />
    </section>
  );
}
