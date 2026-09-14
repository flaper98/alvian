import { cookies } from 'next/headers';
import { COOKIE_NAME, getSessionUser } from '@/lib/auth';
import LoginForm from './LoginForm';
import AdminNav from './AdminNav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin — Alvian',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;

  let user = null;
  try {
    user = getSessionUser(session);
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

  if (!user) {
    return (
      <main className="admin-shell">
        <LoginForm />
      </main>
    );
  }

  return (
    <div className="admin-shell admin-shell-dashboard">
      <AdminNav role={user.role} name={user.name} />
      <main className="admin-content">{children}</main>
    </div>
  );
}
