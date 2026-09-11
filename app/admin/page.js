import { cookies } from 'next/headers';
import { COOKIE_NAME, isValidSession } from '@/lib/auth';
import { listPerfumes } from '@/lib/db';
import LoginForm from './LoginForm';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin — Alvian',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  let authenticated;
  try {
    authenticated = isValidSession(session);
  } catch (error) {
    return (
      <main className="admin-shell">
        <div className="admin-login-form">
          <h1>Falta configuración</h1>
          <p>
            Configura las variables de entorno <code>ADMIN_PASSWORD</code> y{' '}
            <code>SESSION_SECRET</code> en Vercel (Settings → Environment Variables) y
            vuelve a desplegar.
          </p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="admin-shell">
        <LoginForm />
      </main>
    );
  }

  const perfumes = await listPerfumes();

  return (
    <main className="admin-shell">
      <AdminDashboard perfumes={perfumes} />
    </main>
  );
}
