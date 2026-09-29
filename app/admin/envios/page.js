import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { listSuppliers } from '@/lib/db';
import { listShipments, listLinkableWebOrders } from '@/lib/shalom-db';
import { SHIPMENT_CLOSED, SHIPMENT_STATUSES } from '@/lib/shalom';
import ShipmentFormModal from './ShipmentFormModal';
import ShipmentCard from './ShipmentCard';
import { IconTruck, IconClock, IconCheck } from '../icons';

export const dynamic = 'force-dynamic';

const TYPES = [
  ['todos', 'Todos'],
  ['saliente', 'Envíos a clientes'],
  ['entrante', 'Recibos de proveedores'],
];

const STATUS_TABS = [['activos', 'En camino'], ...Object.entries(SHIPMENT_STATUSES), ['todos', 'Todos']];

function StatTile({ icon, label, value, tone }) {
  return (
    <div className={`stat-tile${tone ? ` stat-tile-${tone}` : ''}`}>
      <span className="stat-tile-icon">{icon}</span>
      <div className="stat-tile-body">
        <span className="stat-tile-label">{label}</span>
        <strong className="stat-tile-value">{value}</strong>
      </div>
    </div>
  );
}

function href(tipo, estado) {
  return `/admin/envios?tipo=${tipo}&estado=${estado}`;
}

export default async function EnviosPage({ searchParams }) {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  const params = await searchParams;
  const tipo = TYPES.some(([key]) => key === params.tipo) ? params.tipo : 'todos';
  const estado = STATUS_TABS.some(([key]) => key === params.estado) ? params.estado : 'activos';

  let shipments;
  let webOrders;
  let suppliers;
  try {
    [shipments, webOrders, suppliers] = await Promise.all([
      listShipments(),
      listLinkableWebOrders(),
      listSuppliers(),
    ]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Envíos Shalom</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Un envío ligado a un pedido antiguo (fuera de la lista) igual debe poder editarse.
  for (const s of shipments) {
    if (s.web_order_id && !webOrders.some((o) => o.id === s.web_order_id)) {
      webOrders.push({ id: s.web_order_id, code: s.web_order_code, customer_name: s.web_order_customer });
    }
  }

  // Las fechas se formatean en el servidor (evita diferencias con el navegador).
  const fmt = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  });
  shipments = shipments.map((s) => ({
    ...s,
    updated_label: fmt.format(new Date(s.updated_at)),
    events: s.events.map((e) => ({ ...e, label: fmt.format(new Date(e.created_at)) })),
  }));

  const active = shipments.filter((s) => !SHIPMENT_CLOSED.includes(s.status));
  const byType = tipo === 'todos' ? shipments : shipments.filter((s) => s.direction === tipo);
  const countFor = (key) =>
    key === 'todos'
      ? byType.length
      : key === 'activos'
        ? byType.filter((s) => !SHIPMENT_CLOSED.includes(s.status)).length
        : byType.filter((s) => s.status === key).length;
  const visible =
    estado === 'todos'
      ? byType
      : estado === 'activos'
        ? byType.filter((s) => !SHIPMENT_CLOSED.includes(s.status))
        : byType.filter((s) => s.status === estado);

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Envíos Shalom</h1>
        <ShipmentFormModal webOrders={webOrders} suppliers={suppliers} />
      </div>
      <p className="hint">
        Registra el <strong>N° de orden</strong> y el <strong>código</strong> de cada envío por Shalom
        (los que mandas a clientes y los que te llegan de proveedores). Revisa el estado en Shalom con
        el botón <strong>Ver en Shalom</strong> y actualízalo aquí. Si ligas el envío a un pedido web,
        el cliente lo ve en su página de seguimiento.
      </p>

      <div className="stat-grid">
        <StatTile icon={<IconTruck />} label="En camino" value={active.length} />
        <StatTile
          icon={<IconClock />}
          label="En agencia de destino (por recoger)"
          value={shipments.filter((s) => s.status === 'en_destino').length}
          tone="attention"
        />
        <StatTile
          icon={<IconCheck />}
          label="Con incidencia"
          value={shipments.filter((s) => s.status === 'observado').length}
          tone={shipments.some((s) => s.status === 'observado') ? 'attention' : 'good'}
        />
      </div>

      <div className="status-tabs" role="tablist">
        {TYPES.map(([key, label]) => (
          <Link
            key={key}
            href={href(key, estado)}
            className={`status-tab${tipo === key ? ' active' : ''}`}
            role="tab"
            aria-selected={tipo === key}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="status-tabs" role="tablist">
        {STATUS_TABS.map(([key, label]) => (
          <Link
            key={key}
            href={href(tipo, key)}
            className={`status-tab${estado === key ? ' active' : ''}`}
            role="tab"
            aria-selected={estado === key}
          >
            {label} <span>{countFor(key)}</span>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">
          {shipments.length === 0 ? 'Todavía no registraste envíos por Shalom.' : 'No hay envíos en esta vista.'}
        </p>
      ) : (
        <ul className="web-orders">
          {visible.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              role={role}
              webOrders={webOrders}
              suppliers={suppliers}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
