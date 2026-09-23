'use client';

import { useActionState, useState } from 'react';
import { updateComplaintAction } from '@/lib/store-actions';

export default function ComplaintRow({ complaint: c }) {
  const [open, setOpen] = useState(c.status !== 'respondido');
  const [state, formAction] = useActionState(updateComplaintAction.bind(null, c.id), { error: null });
  const date = c.created_label;
  const mailto = `mailto:${c.email}?subject=${encodeURIComponent(`Respuesta a su ${c.kind} N.° ${c.number}`)}`;

  return (
    <li className={`web-order ${c.status === 'respondido' ? 'status-border-entregado' : 'status-border-pendiente'}`}>
      <button type="button" className="web-order-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="web-order-code">{c.number}</span>
        <span className={`status ${c.status === 'respondido' ? 'status-entregado' : 'status-pendiente'}`}>
          {c.status === 'respondido' ? 'Respondido' : 'Por responder'}
        </span>
        <span className="web-order-name">
          {c.kind === 'queja' ? 'Queja' : 'Reclamo'} · {c.name}
        </span>
        <span className="web-order-date">{date}</span>
      </button>
      {open ? (
        <div className="web-order-body">
          <ul className="plain">
            <li>
              {c.doc} · {c.address} · {c.phone || 'sin teléfono'} · <a href={mailto}>{c.email}</a>
            </li>
            {c.guardian ? <li>Apoderado: {c.guardian}</li> : null}
            <li>
              {c.item_type}
              {c.amount ? ` · S/ ${Number(c.amount).toFixed(2)}` : ''}
              {c.order_code ? ` · Pedido ${c.order_code}` : ''}
              {c.item_desc ? ` · ${c.item_desc}` : ''}
            </li>
            <li>
              <strong>Detalle:</strong> {c.detail}
            </li>
            {c.request ? (
              <li>
                <strong>Pedido del consumidor:</strong> {c.request}
              </li>
            ) : null}
            {c.status !== 'respondido' ? (
              <li className="muted">Responder antes de aprox. {c.deadline_label}</li>
            ) : null}
          </ul>
          <form action={formAction} className="web-order-form">
            <label>
              Respuesta enviada (registro interno)
              <textarea name="response" rows={3} defaultValue={c.response || ''} />
            </label>
            <label>
              Estado
              <select name="status" defaultValue={c.status}>
                <option value="nuevo">Por responder</option>
                <option value="respondido">Respondido</option>
              </select>
            </label>
            <button type="submit" className="btn-primary">Guardar</button>
            {state?.error ? <p className="form-error">{state.error}</p> : null}
            {state?.success ? <p className="form-ok">Guardado.</p> : null}
          </form>
        </div>
      ) : null}
    </li>
  );
}
