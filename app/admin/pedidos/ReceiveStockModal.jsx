'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { receiveOrdersToStockAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Ingresando...' : 'Ingresar a stock'}
    </button>
  );
}

function ReceiveStockForm({ orders, onClose }) {
  const [state, formAction] = useActionState(receiveOrdersToStockAction, { error: null });

  // Se marcan por defecto los pedidos ya cumplidos (lo que ya compraste).
  const [checkedIds, setCheckedIds] = useState(() =>
    orders.filter((order) => order.fulfilled).map((order) => order.id),
  );
  const [costs, setCosts] = useState(() =>
    Object.fromEntries(
      orders.map((order) => [order.id, order.best_price != null ? Number(order.best_price).toFixed(2) : '']),
    ),
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  function toggle(id) {
    setCheckedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  const totalCost = orders
    .filter((order) => checkedIds.includes(order.id))
    .reduce((sum, order) => sum + order.quantity * (Number(costs[order.id]) || 0), 0);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Ingresar pedidos a stock</h2>
      <p className="hint">
        Suma al stock lo que ya compraste de estos pedidos y lo registra como compra (con su costo),
        sin tener que ir a Compras. El costo viene precargado con el precio del proveedor más barato;
        cámbialo si pagaste otro.
      </p>

      <div className="stock-lines">
        {orders.map((order) => (
          <div key={order.id} className="stock-line">
            <label className="checkbox-field stock-line-name">
              <input
                type="checkbox"
                name="orderId"
                value={order.id}
                checked={checkedIds.includes(order.id)}
                onChange={() => toggle(order.id)}
              />
              <span>
                {order.perfume_name} <strong>× {order.quantity}</strong>
                <span className="hint">
                  {' '}
                  {order.order_code ? `${order.order_code} · ` : ''}
                  {order.customer_name}
                </span>
              </span>
            </label>
            <div className="stock-line-cost">
              <input
                name={`cost_${order.id}`}
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo c/u"
                value={costs[order.id]}
                onChange={(event) => setCosts((current) => ({ ...current, [order.id]: event.target.value }))}
                required={checkedIds.includes(order.id)}
              />
              {order.best_supplier_name ? (
                <span className="hint">
                  {order.best_supplier_name} ({order.best_tier_label})
                </span>
              ) : (
                <span className="hint">Sin precio de proveedor</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p>
        {checkedIds.length} pedido{checkedIds.length === 1 ? '' : 's'} · Costo total:{' '}
        <strong>S/ {totalCost.toFixed(2)}</strong>
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function ReceiveStockModal({ orders, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog modal-dialog-wide" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <ReceiveStockForm orders={orders} onClose={onClose} />
      </div>
    </div>
  );
}
