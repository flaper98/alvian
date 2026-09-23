'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { submitComplaintAction } from '@/lib/store-actions';
import { IconCheck } from '../_store/icons';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-gold btn-lg" type="submit" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar hoja de reclamación'}
    </button>
  );
}

export default function ComplaintForm() {
  const [state, formAction] = useActionState(submitComplaintAction, { error: null });
  const old = state?.fields || {};

  if (state?.number) {
    return (
      <div className="thanks">
        <span className="thanks-ic">
          <IconCheck size={30} />
        </span>
        <h2 className="h3">Registramos tu {state.kind}</h2>
        <p className="lead">
          Número de hoja: <strong>{state.number}</strong>
        </p>
        <p className="muted">
          Te responderemos al correo indicado en un plazo no mayor a 15 días hábiles. Guarda este
          número como constancia.
        </p>
        <Link className="btn-gold" href="/">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="co-card claim-form">
      {state?.error ? <div className="alert alert-error">{state.error}</div> : null}
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <h2 className="h4">1. Identificación del consumidor</h2>
      <div className="grid-2">
        <label className="field">
          Nombre completo *<input name="name" required defaultValue={old.name} />
        </label>
        <label className="field">
          DNI / CE *<input name="doc" required defaultValue={old.doc} />
        </label>
        <label className="field">
          Domicilio *<input name="address" required defaultValue={old.address} />
        </label>
        <label className="field">
          Teléfono<input name="phone" defaultValue={old.phone} />
        </label>
        <label className="field">
          Correo electrónico *<input name="email" type="email" required defaultValue={old.email} />
        </label>
        <label className="field">
          Padre/madre o apoderado (si eres menor de edad)
          <input name="guardian" defaultValue={old.guardian} />
        </label>
      </div>

      <h2 className="h4">2. Identificación del bien contratado</h2>
      <div className="grid-3">
        <label className="field">
          Tipo
          <select name="itemType" defaultValue={old.itemType || 'producto'}>
            <option value="producto">Producto</option>
            <option value="servicio">Servicio</option>
          </select>
        </label>
        <label className="field">
          Monto reclamado (S/)
          <input name="amount" type="number" step="0.01" min="0" defaultValue={old.amount} />
        </label>
        <label className="field">
          N.° de pedido
          <input name="orderCode" placeholder="ALV-01001" defaultValue={old.orderCode} />
        </label>
      </div>
      <label className="field">
        Descripción del producto o servicio
        <input name="itemDesc" defaultValue={old.itemDesc} />
      </label>

      <h2 className="h4">3. Detalle de la reclamación</h2>
      <div className="radio-cards two">
        <label className="rc">
          <input type="radio" name="kind" value="reclamo" defaultChecked={old.kind === 'reclamo'} />
          <span className="rc-body">
            <strong>Reclamo</strong>
            <small>Disconformidad relacionada con los productos o servicios.</small>
          </span>
        </label>
        <label className="rc">
          <input type="radio" name="kind" value="queja" defaultChecked={old.kind === 'queja'} />
          <span className="rc-body">
            <strong>Queja</strong>
            <small>Malestar respecto a la atención, no relacionado con el producto.</small>
          </span>
        </label>
      </div>
      <label className="field">
        Detalle *<textarea name="detail" rows={4} required defaultValue={old.detail} />
      </label>
      <label className="field">
        Pedido del consumidor<textarea name="request" rows={3} defaultValue={old.request} />
      </label>
      <label className="check">
        <input type="checkbox" name="accept" required /> Declaro que la información proporcionada es verdadera.
      </label>
      <p className="muted small">
        La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es
        requisito previo para interponer una denuncia ante el INDECOPI. El proveedor deberá dar
        respuesta al reclamo en un plazo no mayor a quince (15) días hábiles.
      </p>
      <Submit />
    </form>
  );
}
