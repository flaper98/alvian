import { getCurrentRole } from '@/lib/session';
import { listPerfumes } from '@/lib/db';
import CatalogDashboard from './CatalogDashboard';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const perfumes = await listPerfumes();

  return (
    <section className="admin-section">
      <h1>Catálogo</h1>
      <CatalogDashboard perfumes={perfumes} />
    </section>
  );
}
