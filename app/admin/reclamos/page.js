import { getCurrentRole } from '@/lib/session';
import { listComplaints } from '@/lib/store-db';
import ComplaintRow from './ComplaintRow';

export const dynamic = 'force-dynamic';

export default async function ReclamosPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }
  let complaints;
  try {
    complaints = await listComplaints();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Libro de Reclamaciones</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }
  const fmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'America/Lima' });
  complaints = complaints.map((c) => {
    const deadline = new Date(c.created_at);
    deadline.setDate(deadline.getDate() + 21); // ~15 días hábiles
    return { ...c, created_label: fmt.format(new Date(c.created_at)), deadline_label: fmt.format(deadline) };
  });
  const pending = complaints.filter((c) => c.status !== 'respondido').length;
  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Libro de Reclamaciones</h1>
      </div>
      <p className="hint">
        Hojas enviadas desde /reclamaciones. Por ley debes responder al correo del cliente en un
        plazo máximo de 15 días hábiles. {pending ? `Tienes ${pending} sin responder.` : ''}
      </p>
      {complaints.length === 0 ? (
        <p className="empty-state">No hay reclamos registrados.</p>
      ) : (
        <ul className="web-orders">
          {complaints.map((c) => (
            <ComplaintRow key={c.id} complaint={c} />
          ))}
        </ul>
      )}
    </section>
  );
}
