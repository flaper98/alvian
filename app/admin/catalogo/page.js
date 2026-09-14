import { getCurrentRole } from '@/lib/session';
import { listPerfumes } from '@/lib/db';
import CatalogDashboard from './CatalogDashboard';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  try {
    perfumes = await listPerfumes();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Catálogo</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Catálogo</h1>
      <CatalogDashboard perfumes={perfumes} />
    </section>
  );
}
