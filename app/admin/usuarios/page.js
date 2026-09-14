import { getCurrentRole } from '@/lib/session';
import { listUsers } from '@/lib/db';
import UsersDashboard from './UsersDashboard';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let users;
  try {
    users = await listUsers();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Usuarios</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Usuarios</h1>
      <UsersDashboard users={users} />
    </section>
  );
}
