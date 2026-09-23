'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  updateWebOrderAction,
  registerWebOrderSaleAction,
  deleteWebOrderAction,
} from '@/lib/store-actions';
import { ORDER_STATUSES, PAYMENT_METHODS, formatMoney } from '@/lib/store-config';

function whatsappLink(phone, text) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 9) digits = `51${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  );
}

const STATUS_MESSAGES = {
  pagado: (o) => `Hola ${o.customer_name}, confirmamos el pago de tu pedido ${o.code}. ¡Gracias! Ya lo estamos preparando.`,
  preparando: (o) => `Hola ${o.customer_name}, tu pedido ${o.code} se está preparando.`,
  enviado: (o) =>
    `Hola ${o.customer_name}, tu pedido ${o.code} ya fue enviado.${o.tracking ? ` Datos del envío: ${o.tracking}` : ''}`,
  entregado: (o) => `Hola ${o.customer_name}, ¡gracias por tu compra en Alvian! Esperamos que disfrutes tu perfume.`,
  pendiente: (o) =>
    `Hola ${o.customer_name}, recibimos tu pedido ${o.code} por ${formatMoney(o.total)}. ¿Nos confirmas el pago para despacharlo?`,
  cancelado: (o) => `Hola ${o.customer_name}, tu pedido ${o.code} fue cancelado. Cualquier duda, escríbenos.`,
};

export default function WebOrderCard({ order, role }) {
  const [open, setOpen] = useState(order.status === 'pendiente');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState('');
  const bound = updateWebOrderAction.bind(null, order.id);
  const [state, formAction] = useActionState(bound, { error: null });
  const registered = order.sale_ids?.length > 0;
  const date = order.created_label;

  useEffect(() => {
    if (state?.success) setActionError('');
  }, [state]);

  function run(action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setActionError('');
    startTransition(async () => {
      const result = await action(order.id);
      if (result?.error) setActionError(result.error);
    });
  }

  const message = (STATUS_MESSAGES[order.status] || STATUS_MESSAGES.pendiente)(order);

  return (
    <li className={`web-order status-border-${order.status}`}>
      <button type="button" className="web-order-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="web-order-code">{order.code}</span>
        <span className={`status status-${order.status}`}>{ORDER_STATUSES[order.status]}</span>
        <span className="web-order-name">{order.customer_name}</span>
        <span className="web-order-total">{formatMoney(order.total)}</span>
        <span className="web-order-date">{date}</span>
      </button>

      {open ? (
        <div className="web-order-body">
          <div className="web-order-grid">
            <div>
              <h3>Productos</h3>
              <ul className="plain">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} × {item.name} — {formatMoney(item.line_total)}
                  </li>
                ))}
                <li>
                  Envío: {order.shipping_name} —{' '}
                  {Number(order.shipping_cost) > 0 ? formatMoney(order.shipping_cost) : 'Gratis'}
                </li>
                <li>
                  <strong>Total: {formatMoney(order.total)}</strong>
                </li>
              </ul>
              {registered ? (
                <p className="badge badge-paid">Registrado como venta</p>
              ) : null}
            </div>
            <div>
              <h3>Cliente</h3>
              <ul className="plain">
                <li>
                  <a href={whatsappLink(order.phone, message)} target="_blank" rel="noopener noreferrer">
                    {order.phone}
                  </a>
                  {order.doc ? ` · DNI ${order.doc}` : ''}
                </li>
                {order.email ? <li>{order.email}</li> : null}
                <li>
                  {[order.address, order.district, order.province, order.department].filter(Boolean).join(', ')}
                </li>
                {order.reference ? <li>Ref: {order.reference}</li> : null}
                {order.customer_notes ? <li>Nota: {order.customer_notes}</li> : null}
              </ul>
            </div>
            <div>
              <h3>Pago</h3>
              <ul className="plain">
                <li>{PAYMENT_METHODS[order.payment_method] || order.payment_method}</li>
                {order.operation_number ? <li>Operación: {order.operation_number}</li> : null}
                <li>
                  {order.voucher_url ? (
                    <a href={order.voucher_url} target="_blank" rel="noopener noreferrer" className="voucher-link">
                      {/\.pdf($|\?)/i.test(order.voucher_url) ? (
                        'Ver comprobante (PDF)'
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.voucher_url} alt="Comprobante de pago" />
                      )}
                    </a>
                  ) : order.payment_method === 'contraentrega' ? (
                    'Paga al recibir'
                  ) : (
                    <span className="muted">Sin comprobante (pídelo por WhatsApp)</span>
                  )}
                </li>
              </ul>
            </div>
          </div>

          <form action={formAction} className="web-order-form" key={`${order.status}-${order.updated_at}`}>
            <label>
              Estado
              <select name="status" defaultValue={order.status}>
                {Object.entries(ORDER_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Seguimiento del envío (lo ve el cliente)
              <input name="tracking" defaultValue={order.tracking || ''} placeholder="Ej: Shalom · clave 1234 · orden 5678" />
            </label>
            <label>
              Nota interna
              <input name="adminNote" defaultValue={order.admin_note || ''} />
            </label>
            <SaveButton />
            {state?.error ? <p className="form-error">{state.error}</p> : null}
            {state?.success ? <p className="form-ok">Guardado.</p> : null}
          </form>

          <div className="web-order-actions">
            <a className="btn-secondary" href={whatsappLink(order.phone, message)} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
            {!registered && order.status !== 'cancelado' ? (
              <button
                type="button"
                className="btn-primary"
                disabled={isPending}
                onClick={() =>
                  run(
                    registerWebOrderSaleAction,
                    '¿Registrar este pedido como venta? Se descontará el stock y se sumará al Resumen.',
                  )
                }
              >
                {isPending ? 'Procesando…' : 'Registrar como venta'}
              </button>
            ) : null}
            {role === 'admin' && !registered ? (
              <button
                type="button"
                className="btn-danger"
                disabled={isPending}
                onClick={() => run(deleteWebOrderAction, `¿Eliminar el pedido ${order.code}? No se puede deshacer.`)}
              >
                Eliminar
              </button>
            ) : null}
          </div>
          {registered && order.status === 'cancelado' ? (
            <p className="hint">
              Este pedido ya estaba registrado como venta. Si no se concretó, elimina esas ventas en
              la sección Ventas para devolver el stock.
            </p>
          ) : null}
          {actionError ? <p className="form-error">{actionError}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
