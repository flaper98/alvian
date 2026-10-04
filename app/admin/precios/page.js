import { getCurrentRole } from '@/lib/session';
import { getPricingPlan } from '@/lib/db';
import PricingBoard from './PricingBoard';

export const dynamic = 'force-dynamic';

export default async function PreciosPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let plan;
  try {
    plan = await getPricingPlan();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Precios</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const { commissionPercent, taxPercent } = plan.rates;
  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Precios</h1>
      </div>
      <p className="hint">
        Pon el margen que quieres ganar y el sistema calcula el precio de venta de cada perfume desde su costo, ya
        descontando la comisión de la vendedora ({commissionPercent}%){taxPercent > 0 ? ` y el impuesto (${taxPercent}%)` : ''}.
        El costo es el promedio de tus compras con flete o, si nunca lo compraste, el precio por mayor más barato de
        tus proveedores. Nada cambia en la tienda hasta que lo apliques.
      </p>
      <PricingBoard items={plan.items} config={plan.config} rates={plan.rates} />
    </section>
  );
}
