'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createShipmentAction, updateShipmentAction } from '@/lib/shalom-actions';
import { SHIPMENT_DIRECTIONS, SHIPMENT_STATUSES } from '@/lib/shalom';

const DIRECTION_HINTS = {
  saliente: 'Tú lo mandas',
  entrante: 'Te lo mandan',
};

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
  const outgoing = direction === 'saliente';

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
    <form action={formAction} className="perfume-form shipment-form">
      <header className="shipment-form-head">
        <h2>{editing ? 'Editar envío Shalom' : 'Registrar envío Shalom'}</h2>
        <p className="hint">Solo el N° de orden y el código son obligatorios.</p>
      </header>

      <fieldset className="shipment-direction" aria-label="Tipo de envío">
        {Object.entries(SHIPMENT_DIRECTIONS).map(([key, label]) => (
          <label key={key} className={direction === key ? 'active' : ''}>
            <input
              type="radio"
              name="direction"
              value={key}
              checked={direction === key}
              onChange={() => setDirection(key)}
            />
            <span className="shipment-direction-icon" aria-hidden="true">
              {key === 'saliente' ? '↑' : '↓'}
            </span>
            <span className="shipment-direction-text">
              <strong>{label}</strong>
              <small>{DIRECTION_HINTS[key]}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <section className="shipment-block">
        <h3>
          <span>1</span> Datos de Shalom
        </h3>
        <div className="shipment-form-row">
          <label>
            N° de orden *
            <input
              name="orderNumber"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder="12345678"
              defaultValue={shipment?.order_number || ''}
              required
            />
          </label>
          <label>
            Código *
            <input
              name="orderCode"
              className="shipment-code-input"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
              placeholder="A1B2"
              defaultValue={shipment?.order_code || ''}
              required
            />
          </label>
        </div>
        <p className="shipment-help">Los encuentras en el ticket que te da Shalom al registrar el envío.</p>
      </section>

      <section className="shipment-block">
        <h3>
          <span>2</span> {outgoing ? 'Cliente' : 'Proveedor'}
        </h3>
        {outgoing ? (
          <label>
            Pedido web
            <select name="webOrderId" defaultValue={shipment?.web_order_id || ''} onChange={handleWebOrder}>
              <option value="">Sin pedido web</option>
              {webOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} · {o.customer_name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label>
            Proveedor
            <select name="supplierId" defaultValue={shipment?.supplier_id || ''} onChange={handleSupplier}>
              <option value="">Sin proveedor</option>
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
            {outgoing ? 'Nombre del cliente' : 'Remitente'}
            <input
              name="contactName"
              autoComplete="off"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label>
            Celular
            <input
              name="contactPhone"
              type="tel"
              inputMode="numeric"
              maxLength={9}
              placeholder="987654321"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="shipment-block">
        <h3>
          <span>3</span> Ruta
        </h3>
        <div className="shipment-form-row shipment-route">
          <label>
            Agencia de origen
            <input name="origin" placeholder="Pucallpa" defaultValue={shipment?.origin || ''} />
          </label>
          <span className="shipment-route-arrow" aria-hidden="true">
            →
          </span>
          <label>
            Agencia de destino
            <input
              name="destination"
              placeholder="Lima - Los Olivos"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="shipment-block">
        <h3>
          <span>4</span> Estado
        </h3>
        <div className="shipment-form-row">
          <label>
            Estado actual
            <select name="status" defaultValue={shipment?.status || 'registrado'}>
              {Object.entries(SHIPMENT_STATUSES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nota
            <input name="note" defaultValue={shipment?.note || ''} placeholder="2 perfumes, pago en destino" />
          </label>
        </div>
      </section>

      <footer className="shipment-form-actions">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton editing={editing} />
        </div>
      </footer>
    </form>
  );
}

export function ShipmentModal({ shipment, webOrders, suppliers, onClose }) {
  return (
    <div className="modal-backdrop modal-backdrop-shipment" onClick={onClose}>
      <div className="modal-dialog modal-dialog-shipment" onClick={(event) => event.stopPropagation()}>
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
