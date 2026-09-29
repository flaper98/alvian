import { getCurrentRole } from '@/lib/session';
import { listStockLosses, listPerfumes } from '@/lib/db';
import LossFormModal from './LossFormModal';
import LossesList from './LossesList';

export const dynamic = 'force-dynamic';

export default async function PerdidasPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let losses;
  let perfumes;
  try {
    [losses, perfumes] = await Promise.all([listStockLosses(), listPerfumes()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Pérdidas</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const total = losses.reduce((sum, loss) => sum + Number(loss.total_cost), 0);
  const units = losses.reduce((sum, loss) => sum + Number(loss.quantity), 0);
  const sortedPerfumes = [...perfumes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Pérdidas de producto</h1>
        <LossFormModal perfumes={sortedPerfumes} />
      </div>
      <p className="hint">
        Perfumes que se rompieron, se perdieron, vencieron o regalaste. Se descuentan del stock y
        restan de la ganancia en el Resumen.
      </p>
      {losses.length > 0 ? (
        <p>
          Total perdido: <strong className="text-critical">S/ {total.toFixed(2)}</strong> ({units}{' '}
          unidad{units === 1 ? '' : 'es'})
        </p>
      ) : null}
      <LossesList losses={losses} />
    </section>
  );
}
