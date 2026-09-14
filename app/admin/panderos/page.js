import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listPanderoGroups } from '@/lib/db';
import PanderoGroupFormModal from './PanderoGroupFormModal';
import PanderoGroupCard from './PanderoGroupCard';

export const dynamic = 'force-dynamic';

export default async function PanderosPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let groups;
  try {
    [perfumes, groups] = await Promise.all([listPerfumes(), listPanderoGroups()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Panderos</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Panderos</h1>
        <PanderoGroupFormModal />
      </div>
      <p className="hint">
        Aquí llevas la lista numerada de cada pandero: quién va en cada turno, qué perfume le toca
        y cuándo. Esto es distinto de "Crédito / Pandero" (que es para cobrar lo ya vendido).
      </p>

      {groups.length === 0 ? (
        <p>Todavía no has creado ningún pandero.</p>
      ) : (
        groups.map((group) => (
          <PanderoGroupCard key={group.id} group={group} perfumes={perfumes} />
        ))
      )}
    </section>
  );
}
