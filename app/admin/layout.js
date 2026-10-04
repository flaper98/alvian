import { cookies } from 'next/headers';
import { COOKIE_NAME, getActiveSessionUser, getSessionUser } from '@/lib/auth';
import LoginForm from './LoginForm';
import AdminNav from './AdminNav';
import SectionTabs from './SectionTabs';
import { countWebOrdersByStatus, getNewWebOrders } from '@/lib/store-db';
import OrderAlerts from './OrderAlerts';

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
  // Un usuario desactivado (o con otro rol) queda fuera al instante.
  if (user) user = await getActiveSessionUser(session).catch(() => user);

  if (!user) {
    return (
      <main className="admin-shell">
        <LoginForm />
      </main>
    );
  }

  const counts = await countWebOrdersByStatus();
  // Punto de partida del aviso de pedidos: solo avisa de los que lleguen después.
  const { latest } = await getNewWebOrders().catch(() => ({ latest: null }));

  return (
    <div className="admin-shell admin-shell-dashboard">
      <AdminNav role={user.role} name={user.name} pendingWebOrders={counts.pendiente || 0} />
      <main className="admin-content">
        <SectionTabs role={user.role} pendingWebOrders={counts.pendiente || 0} />
        {children}
      </main>
      <OrderAlerts initialLatestId={latest?.id || 0} />
    </div>
  );
}
