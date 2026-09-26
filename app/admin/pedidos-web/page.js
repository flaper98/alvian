import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { listWebOrders, countWebOrdersByStatus } from '@/lib/store-db';
import { ORDER_STATUSES } from '@/lib/store-config';
import WebOrderCard from './WebOrderCard';

export const dynamic = 'force-dynamic';

const TABS = [
  ['activos', 'Por atender'],
  ['pendiente', ORDER_STATUSES.pendiente],
  ['pagado', ORDER_STATUSES.pagado],
  ['preparando', ORDER_STATUSES.preparando],
  ['enviado', ORDER_STATUSES.enviado],
  ['entregado', ORDER_STATUSES.entregado],
  ['cancelado', ORDER_STATUSES.cancelado],
  ['todos', 'Todos'],
];

const ACTIVE = ['pendiente', 'pagado', 'preparando', 'enviado'];

export default async function PedidosWebPage({ searchParams }) {
  const role = await getCurrentRole();
  if (!role) return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;

  const { estado = 'activos' } = await searchParams;
  let orders;
  let counts;
  try {
    [orders, counts] = await Promise.all([
      listWebOrders({ status: ORDER_STATUSES[estado] ? estado : undefined }),
      countWebOrdersByStatus(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Pedidos web</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }
  if (estado === 'activos') orders = orders.filter((o) => ACTIVE.includes(o.status));
  // La fecha se formatea en el servidor (evita diferencias de formato con el navegador).
  const fmt = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  });
  orders = orders.map((o) => ({ ...o, created_label: fmt.format(new Date(o.created_at)) }));
  const activeCount = ACTIVE.reduce((sum, s) => sum + (counts[s] || 0), 0);
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Pedidos web</h1>
      </div>
      <p className="hint">
        Pedidos hechos desde el carrito de la tienda. Revisa el comprobante y cambia el estado a
        <strong> Pagado</strong>: se registra solo como venta (descuenta el stock y suma al Resumen).
        Los pedidos contra entrega se registran al marcarlos como <strong>Entregado</strong>.
      </p>

      <div className="status-tabs" role="tablist">
        {TABS.map(([key, label]) => {
          const n = key === 'activos' ? activeCount : key === 'todos' ? allCount : counts[key] || 0;
          return (
            <Link
              key={key}
              href={`/admin/pedidos-web?estado=${key}`}
              className={`status-tab${estado === key ? ' active' : ''}`}
              role="tab"
              aria-selected={estado === key}
            >
              {label} <span>{n}</span>
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="empty-state">No hay pedidos en esta vista.</p>
      ) : (
        <ul className="web-orders">
          {orders.map((order) => (
            <WebOrderCard key={order.id} order={order} role={role} />
          ))}
        </ul>
      )}
    </section>
  );
}
