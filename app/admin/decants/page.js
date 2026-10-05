import { getCurrentRole } from '@/lib/session';
import { listDecantCatalog } from '@/lib/db';
import DecantsBoard from './DecantsBoard';

export const dynamic = 'force-dynamic';

export default async function DecantsPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let catalog;
  try {
    catalog = await listDecantCatalog();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Decants</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Decants</h1>
      </div>
      <p className="hint">
        1) Activa «Vender en tienda» en los perfumes que quieras ofrecer en decant. 2) Cuando abras un frasco, pulsa
        «Abrir frasco»: sale 1 del stock y sus ml quedan para llenar decants. 3) Cada decant que vendas (en la tienda
        o en Ventas) descuenta sus ml y calcula su ganancia con el costo real: ml × costo por ml + envase. Lo que uses
        en probadores o se derrame, descuéntalo con «Ajustar».
      </p>
      <DecantsBoard catalog={catalog} />
    </section>
  );
}
