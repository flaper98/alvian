'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { setShipmentStatusAction, deleteShipmentAction } from '@/lib/shalom-actions';
import { SHALOM_TRACK_URL, SHIPMENT_DIRECTIONS, SHIPMENT_STATUSES } from '@/lib/shalom';
import { ShipmentModal } from './ShipmentFormModal';

function whatsappLink(phone, text) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 9) digits = `51${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function customerMessage(s) {
  const base = `Hola ${s.contact_name || ''}, tu pedido${s.web_order_code ? ` ${s.web_order_code}` : ''} va por Shalom.`;
  const data = `N° de orden: ${s.order_number} · Código: ${s.order_code}.`;
  if (s.status === 'en_destino') {
    return `${base} ¡Ya llegó a la agencia${s.destination ? ` ${s.destination}` : ''}! Puedes recogerlo con tu DNI. ${data}`;
  }
  return `${base} ${data} Puedes seguirlo en ${SHALOM_TRACK_URL}`;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Actualizar'}
    </button>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="shipment-copy"
      title={`Copiar ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      <span className="muted small">{copied ? '¡Copiado!' : 'Copiar'}</span>
    </button>
  );
}

export default function ShipmentCard({ shipment, role, webOrders, suppliers }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState('');
  const bound = setShipmentStatusAction.bind(null, shipment.id);
  const [state, formAction] = useActionState(bound, { error: null });
  const s = shipment;
  const who = s.web_order_code
    ? `${s.web_order_code} · ${s.contact_name || s.web_order_customer || ''}`
    : s.supplier_name || s.contact_name || 'Sin nombre';

  function handleDelete() {
    if (!window.confirm(`¿Eliminar el envío ${s.order_number}? También se borra su historial.`)) return;
    setActionError('');
    startTransition(async () => {
      const result = await deleteShipmentAction(s.id);
      if (result?.error) setActionError(result.error);
    });
  }

  return (
    <li className={`web-order shipment-border-${s.status}`}>
      <button type="button" className="web-order-head shipment-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`shipment-dir shipment-dir-${s.direction}`}>
          {s.direction === 'saliente' ? '↑ Envío' : '↓ Recibo'}
        </span>
        <span className="web-order-code">N° {s.order_number}</span>
        <span className="web-order-name">{who}</span>
        <span className={`status shipment-status-${s.status}`}>{SHIPMENT_STATUSES[s.status] || s.status}</span>
        <span className="web-order-date">{s.updated_label}</span>
      </button>

      {open ? (
        <div className="web-order-body">
          <div className="web-order-grid">
            <div>
              <h3>Shalom</h3>
              <div className="shipment-codes">
                <CopyButton value={s.order_number} label="N° de orden" />
                <CopyButton value={s.order_code} label="Código" />
              </div>
              <a className="btn-secondary shipment-track" href={SHALOM_TRACK_URL} target="_blank" rel="noopener noreferrer">
                Ver en Shalom ↗
              </a>
            </div>
            <div>
              <h3>{s.direction === 'saliente' ? 'Cliente' : 'Remitente'}</h3>
              <ul className="plain">
                <li>{SHIPMENT_DIRECTIONS[s.direction]}</li>
                {s.web_order_code ? <li>Pedido web: {s.web_order_code}</li> : null}
                {s.supplier_name ? <li>Proveedor: {s.supplier_name}</li> : null}
                {s.contact_name ? <li>{s.contact_name}</li> : null}
                {s.contact_phone ? (
                  <li>
                    <a href={whatsappLink(s.contact_phone, customerMessage(s))} target="_blank" rel="noopener noreferrer">
                      {s.contact_phone} (WhatsApp)
                    </a>
                  </li>
                ) : null}
                {s.origin || s.destination ? (
                  <li>
                    {s.origin || '—'} → {s.destination || '—'}
                  </li>
                ) : null}
                {s.note ? <li>Nota: {s.note}</li> : null}
              </ul>
            </div>
            <div>
              <h3>Historial</h3>
              <ol className="shipment-history">
                {[...s.events].reverse().map((event) => (
                  <li key={event.id}>
                    <strong>{SHIPMENT_STATUSES[event.status] || event.status}</strong>
                    <span className="muted small"> · {event.label}</span>
                    {event.note ? <p className="muted small">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <form action={formAction} className="web-order-form shipment-status-form" key={`${s.status}-${s.updated_at}`}>
            <label>
              Nuevo estado
              <select name="status" defaultValue={s.status}>
                {Object.entries(SHIPMENT_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nota para el historial (opcional)
              <input name="note" placeholder="Ej: Shalom indica llegada mañana" />
            </label>
            <SaveButton />
            {state?.error ? <p className="form-error">{state.error}</p> : null}
          </form>

          <div className="web-order-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              Editar
            </button>
            {role === 'admin' ? (
              <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
                {isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            ) : null}
          </div>
          {actionError ? <p className="form-error">{actionError}</p> : null}
        </div>
      ) : null}

      {editing ? (
        <ShipmentModal shipment={s} webOrders={webOrders} suppliers={suppliers} onClose={() => setEditing(false)} />
      ) : null}
    </li>
  );
}
