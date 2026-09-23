import { buildWhatsAppLink } from '@/lib/whatsapp';
import { ORDER_FLOW, ORDER_STATUSES, PAYMENT_METHODS, formatMoney } from '@/lib/store-config';
import WhatsAppIcon from '../WhatsAppIcon';
import { IconTruck } from './icons';

export function orderWhatsAppMessage(order) {
  const lines = order.items.map(
    (i) => `• ${i.quantity} x ${i.name} — ${formatMoney(i.line_total ?? i.lineTotal)}`,
  );
  return [
    `Hola Alvian, acabo de hacer el pedido *${order.code}* en la web:`,
    ...lines,
    `Envío: ${order.shipping_name} (${Number(order.shipping_cost) > 0 ? formatMoney(order.shipping_cost) : 'gratis'})`,
    `*Total: ${formatMoney(order.total)}*`,
    `Pago: ${PAYMENT_METHODS[order.payment_method] || order.payment_method}`,
    `Nombre: ${order.customer_name}`,
    `Entrega: ${[order.address, order.district, order.department].filter(Boolean).join(', ')}`,
  ].join('\n');
}

export default function OrderView({ order }) {
  const idx = ORDER_FLOW.indexOf(order.status);
  return (
    <div className="order-box">
      <div className="order-top">
        <div>
          <p className="muted small">Pedido</p>
          <p className="order-code">{order.code}</p>
        </div>
        <span className={`status status-${order.status}`}>
          {ORDER_STATUSES[order.status] || order.status}
        </span>
      </div>

      {order.status === 'cancelado' ? (
        <p className="alert alert-error">
          Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.
        </p>
      ) : (
        <ol className="timeline">
          {ORDER_FLOW.map((st, i) => (
            <li key={st} className={`${idx >= 0 && i <= idx ? 'done' : ''} ${i === idx ? 'now' : ''}`}>
              <span className="dot" />
              {ORDER_STATUSES[st]}
            </li>
          ))}
        </ol>
      )}

      {order.tracking ? (
        <div className="tracking">
          <IconTruck size={22} />
          <div>
            <strong>Seguimiento del envío</strong>
            <p>{order.tracking}</p>
          </div>
        </div>
      ) : null}

      <div className="order-items">
        {order.items.map((item) => (
          <div className="row-between" key={item.id ?? item.name}>
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatMoney(item.line_total ?? item.lineTotal)}</span>
          </div>
        ))}
        <div className="row-between muted">
          <span>Envío · {order.shipping_name}</span>
          <span>{Number(order.shipping_cost) > 0 ? formatMoney(order.shipping_cost) : 'Gratis'}</span>
        </div>
        <div className="row-between total">
          <span>Total</span>
          <strong>{formatMoney(order.total)}</strong>
        </div>
      </div>
      <p className="muted small">
        Entrega: {[order.district, order.province, order.department].filter(Boolean).join(', ')} · Pago:{' '}
        {PAYMENT_METHODS[order.payment_method] || order.payment_method}
      </p>
      <a
        className="btn-wa-outline"
        href={buildWhatsAppLink(`Hola, consulto por mi pedido ${order.code}`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon width={18} height={18} /> Consultar por WhatsApp
      </a>
    </div>
  );
}
