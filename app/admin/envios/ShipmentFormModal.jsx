'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createShipmentAction, updateShipmentAction } from '@/lib/shalom-actions';
import { SHIPMENT_DIRECTIONS, SHIPMENT_STATUSES } from '@/lib/shalom';

function SubmitButton({ editing }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Registrar envío'}
    </button>
  );
}

function ShipmentForm({ shipment, webOrders, suppliers, onClose }) {
  const editing = Boolean(shipment);
  const action = editing ? updateShipmentAction.bind(null, shipment.id) : createShipmentAction;
  const [state, formAction] = useActionState(action, { error: null });
  const [direction, setDirection] = useState(shipment?.direction || 'saliente');
  const [contactName, setContactName] = useState(shipment?.contact_name || '');
  const [contactPhone, setContactPhone] = useState(shipment?.contact_phone || '');
  const [destination, setDestination] = useState(shipment?.destination || '');

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  // Al elegir un pedido web se completan los datos del cliente (se pueden cambiar).
  function handleWebOrder(event) {
    const order = webOrders.find((o) => String(o.id) === event.target.value);
    if (!order) return;
    setContactName(order.customer_name);
    setContactPhone(order.phone || '');
    if (!destination) setDestination([order.district, order.department].filter(Boolean).join(', '));
  }

  function handleSupplier(event) {
    const supplier = suppliers.find((s) => String(s.id) === event.target.value);
    if (supplier && !contactName) setContactName(supplier.name);
  }

  return (
    <form action={formAction} className="perfume-form">
      <h2>{editing ? 'Editar envío Shalom' : 'Registrar envío Shalom'}</h2>

      <fieldset className="shipment-direction">
        {Object.entries(SHIPMENT_DIRECTIONS).map(([key, label]) => (
          <label key={key} className={direction === key ? 'active' : ''}>
            <input
              type="radio"
              name="direction"
              value={key}
              checked={direction === key}
              onChange={() => setDirection(key)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <div className="shipment-form-row">
        <label>
          N° de orden
          <input
            name="orderNumber"
            inputMode="numeric"
            placeholder="Ej: 12345678"
            defaultValue={shipment?.order_number || ''}
            required
          />
        </label>
        <label>
          Código
          <input
            name="orderCode"
            placeholder="Ej: A1B2"
            autoCapitalize="characters"
            defaultValue={shipment?.order_code || ''}
            required
          />
        </label>
      </div>
      <p className="hint">Están en la boleta o ticket que te dio Shalom al registrar el envío.</p>

      {direction === 'saliente' ? (
        <label>
          Pedido web (opcional)
          <select name="webOrderId" defaultValue={shipment?.web_order_id || ''} onChange={handleWebOrder}>
            <option value="">— Sin pedido web —</option>
            {webOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.customer_name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Proveedor (opcional)
          <select name="supplierId" defaultValue={shipment?.supplier_id || ''} onChange={handleSupplier}>
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="shipment-form-row">
        <label>
          {direction === 'saliente' ? 'Cliente' : 'Remitente'}
          <input name="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </label>
        <label>
          Celular
          <input
            name="contactPhone"
            type="tel"
            inputMode="numeric"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </label>
      </div>

      <div className="shipment-form-row">
        <label>
          Agencia de origen
          <input name="origin" placeholder="Ej: Pucallpa" defaultValue={shipment?.origin || ''} />
        </label>
        <label>
          Agencia de destino
          <input
            name="destination"
            placeholder="Ej: Lima - Los Olivos"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
      </div>

      <label>
        Estado
        <select name="status" defaultValue={shipment?.status || 'registrado'}>
          {Object.entries(SHIPMENT_STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Nota (opcional)
        <input name="note" defaultValue={shipment?.note || ''} placeholder="Ej: 2 perfumes, pago en destino" />
      </label>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton editing={editing} />
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function ShipmentModal({ shipment, webOrders, suppliers, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <ShipmentForm shipment={shipment} webOrders={webOrders} suppliers={suppliers} onClose={onClose} />
      </div>
    </div>
  );
}

export default function ShipmentFormModal({ webOrders, suppliers }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nuevo envío
      </button>
      {open ? (
        <ShipmentModal webOrders={webOrders} suppliers={suppliers} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
