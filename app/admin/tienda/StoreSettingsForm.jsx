'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveStoreConfigAction } from '@/lib/store-actions';
import { ImageField } from '../catalogo/AddPerfumeForm';

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar ajustes de la tienda'}
    </button>
  );
}

function Check({ name, label, defaultChecked, hint }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span>
        {label}
        {hint ? <small className="hint"> — {hint}</small> : null}
      </span>
    </label>
  );
}

export default function StoreSettingsForm({ config }) {
  const [state, formAction] = useActionState(saveStoreConfigAction, { error: null });
  const [ships, setShips] = useState(config.shipping.options);
  const [banks, setBanks] = useState(config.payment.banks.length ? config.payment.banks : [{}]);
  const p = config.payment;
  const b = config.business;

  return (
    <form action={formAction} className="perfume-form store-settings">
      <fieldset className="store-fields">
        <legend>Barra de anuncio (arriba de la tienda)</legend>
        <Check name="announceEnabled" label="Mostrar barra" defaultChecked={config.announce.enabled} />
        <label>
          Texto
          <input name="announceText" defaultValue={config.announce.text} maxLength={160} />
        </label>
      </fieldset>

      <fieldset className="store-fields">
        <legend>Pagos</legend>
        <Check name="yapeEnabled" label="Aceptar Yape / Plin" defaultChecked={p.yapeEnabled} />
        <div className="grid-2">
          <label>
            Número Yape / Plin
            <input name="yapeNumber" defaultValue={p.yapeNumber} />
          </label>
          <label>
            Titular (como aparece en Yape)
            <input name="yapeName" defaultValue={p.yapeName} />
          </label>
        </div>
        <ImageField name="yapeQr" label="QR de Yape (opcional)" defaultValue={p.yapeQr} required={false} />

        <Check
          name="cashOnDeliveryEnabled"
          label="Aceptar pago contra entrega"
          hint="solo para envíos marcados como 'local'"
          defaultChecked={p.cashOnDeliveryEnabled}
        />
        <Check name="transferEnabled" label="Aceptar transferencia bancaria" defaultChecked={p.transferEnabled} />
        <input type="hidden" name="bank__count" value={banks.length} />
        {banks.map((bank, i) => (
          <div className="repeater-row" key={i}>
            <input name={`bank_${i}_bank`} placeholder="Banco" defaultValue={bank.bank} />
            <input name={`bank_${i}_account`} placeholder="N.° de cuenta" defaultValue={bank.account} />
            <input name={`bank_${i}_cci`} placeholder="CCI" defaultValue={bank.cci} />
            <input name={`bank_${i}_holder`} placeholder="Titular" defaultValue={bank.holder} />
            <button type="button" className="btn-danger" onClick={() => setBanks(banks.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={() => setBanks([...banks, {}])}>
          + Agregar cuenta
        </button>

        <Check
          name="voucherRequired"
          label="Exigir captura del comprobante al comprar"
          hint="si lo desactivas, el cliente puede enviarla luego por WhatsApp"
          defaultChecked={p.voucherRequired}
        />
        <label>
          Instrucciones de pago
          <textarea name="instructions" rows={2} defaultValue={p.instructions} />
        </label>
        <label>
          Mensaje de agradecimiento tras la compra
          <textarea name="thanks" rows={2} defaultValue={p.thanks} />
        </label>
      </fieldset>

      <fieldset className="store-fields">
        <legend>Envíos</legend>
        <input type="hidden" name="ship__count" value={ships.length} />
        {ships.map((ship, i) => (
          <div className="repeater-row repeater-ship" key={ship.id || i}>
            <input type="hidden" name={`ship_${i}_id`} defaultValue={ship.id} />
            <input name={`ship_${i}_name`} placeholder="Nombre (ej. Delivery en Pucallpa)" defaultValue={ship.name} />
            <input name={`ship_${i}_detail`} placeholder="Detalle (ej. mismo día)" defaultValue={ship.detail} />
            <input
              name={`ship_${i}_price`}
              type="number"
              min="0"
              step="0.5"
              placeholder="S/"
              defaultValue={ship.price}
            />
            <label className="checkbox-row inline">
              <input type="checkbox" name={`ship_${i}_local`} defaultChecked={ship.local} /> Local
            </label>
            <button type="button" className="btn-danger" onClick={() => setShips(ships.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setShips([...ships, { id: '', name: '', detail: '', price: 0, local: false }])}
        >
          + Agregar opción de envío
        </button>
        <label>
          Envío gratis desde (S/) — 0 = desactivado
          <input name="freeFrom" type="number" min="0" step="1" defaultValue={config.shipping.freeFrom} />
        </label>
      </fieldset>

      <fieldset className="store-fields">
        <legend>Datos del negocio (pie de página y Libro de Reclamaciones)</legend>
        <div className="grid-2">
          <label>
            Razón social / nombre comercial
            <input name="razonSocial" defaultValue={b.razonSocial} placeholder="Alvian Perfumes" />
          </label>
          <label>
            RUC
            <input name="ruc" defaultValue={b.ruc} inputMode="numeric" maxLength={11} />
          </label>
          <label>
            Dirección
            <input name="businessAddress" defaultValue={b.address} />
          </label>
          <label>
            Correo (para reclamos)
            <input name="businessEmail" type="email" defaultValue={b.email} />
          </label>
          <label>
            Horario de atención
            <input name="hours" defaultValue={b.hours} />
          </label>
        </div>
      </fieldset>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-ok">Ajustes guardados. Ya se ven en la tienda.</p> : null}
      <Save />
    </form>
  );
}
