'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import { placeOrderAction } from '@/lib/store-actions';
import {
  DEPARTMENTS,
  PAYMENT_METHODS,
  availablePaymentMethods,
  formatMoney,
  shippingCostFor,
} from '@/lib/store-config';
import { useCart } from '../_store/CartProvider';
import { IconBag, IconLock, IconUpload, IconCheck } from '../_store/icons';

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-gold btn-lg btn-block" type="submit" disabled={pending || disabled}>
      <IconLock size={18} /> {pending ? 'Enviando pedido…' : 'Confirmar pedido'}
    </button>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s/g, ''));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch (error) {
          setCopied(false);
        }
      }}
    >
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function VoucherField({ required, voucherUrl, setVoucherUrl }) {
  const [state, setState] = useState({ uploading: false, error: '', name: '', preview: '' });
  const inputRef = useRef(null);

  async function onChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setState((s) => ({ ...s, error: 'El archivo supera 6 MB.' }));
      return;
    }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setState({ uploading: true, error: '', name: file.name, preview });
    try {
      const safeName = file.name.replace(/[^\w.\- ]/g, '_').slice(-80) || 'comprobante';
      const blob = await upload(`comprobantes/${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/voucher',
      });
      setVoucherUrl(blob.url);
      setState((s) => ({ ...s, uploading: false }));
    } catch (error) {
      setVoucherUrl('');
      setState((s) => ({
        ...s,
        uploading: false,
        error:
          'No se pudo subir el comprobante. Intenta de nuevo o envíalo luego por WhatsApp.',
      }));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="upload">
      <label className="upload-box">
        <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={onChange} />
        {state.name ? (
          <span className="upload-preview">
            {state.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.preview} alt="" />
            ) : null}
            <span>
              {state.name}
              <small>
                {state.uploading
                  ? 'Subiendo…'
                  : voucherUrl
                    ? '✓ Comprobante listo · toca para cambiar'
                    : 'Toca para intentar de nuevo'}
              </small>
            </span>
          </span>
        ) : (
          <span className="upload-empty">
            <IconUpload size={26} />
            <strong>Sube la captura de tu pago{required ? ' *' : ' (opcional)'}</strong>
            <small>JPG, PNG o PDF · máx. 6 MB</small>
          </span>
        )}
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
    </div>
  );
}

export default function CheckoutForm({ config }) {
  const { items, subtotal, ready } = useCart();
  const [state, formAction] = useActionState(placeOrderAction, { error: null });
  const old = state?.fields || {};
  const options = config.shipping.options;

  const [shippingId, setShippingId] = useState(old.shipping || options[0]?.id || '');
  const option = options.find((o) => o.id === shippingId) || options[0];
  const methods = useMemo(() => availablePaymentMethods(config, option), [config, option]);
  const [method, setMethod] = useState(old.method || methods[0] || '');
  const [voucherUrl, setVoucherUrl] = useState(old.voucherUrl || '');
  const [department, setDepartment] = useState(old.department || 'Ucayali');

  // Si el método elegido deja de estar disponible (p. ej. contra entrega fuera
  // de Pucallpa), se cambia al primero disponible.
  useEffect(() => {
    if (!methods.includes(method)) setMethod(methods[0] || '');
  }, [methods, method]);

  // Al elegir un envío local, el departamento es Ucayali.
  useEffect(() => {
    if (option?.local) setDepartment('Ucayali');
  }, [option]);

  const shipping = shippingCostFor(config, option, subtotal);
  const total = subtotal + shipping;
  const voucherRequired = config.payment.voucherRequired && method !== 'contraentrega';
  const cartJson = JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty })));

  if (ready && items.length === 0) {
    return (
      <div className="empty-cart">
        <IconBag size={44} />
        <h2 className="h3">Tu carrito está vacío</h2>
        <p className="muted">Agrega perfumes para continuar con tu compra.</p>
        <Link href="/#catalogo" className="btn-gold">
          Ver perfumes
        </Link>
      </div>
    );
  }

  return (
    <>
      {state?.error ? (
        <div className="alert alert-error" role="alert">
          <strong>Revisa lo siguiente:</strong> {state.error}
        </div>
      ) : null}

      <form className="checkout" action={formAction}>
        <input type="hidden" name="cart" value={cartJson} />
        <input type="hidden" name="voucherUrl" value={voucherUrl} />
        <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />

        <div className="co-main">
          <fieldset className="co-card">
            <legend>
              <span className="n">1</span>Tus datos
            </legend>
            <div className="grid-2">
              <label className="field">
                Nombre completo *
                <input name="name" required autoComplete="name" defaultValue={old.name} />
              </label>
              <label className="field">
                Celular (WhatsApp) *
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="999 999 999"
                  defaultValue={old.phone}
                />
              </label>
              <label className="field">
                DNI / CE
                <input name="doc" inputMode="numeric" defaultValue={old.doc} />
              </label>
              <label className="field">
                Correo
                <input name="email" type="email" autoComplete="email" defaultValue={old.email} />
              </label>
            </div>
          </fieldset>

          <fieldset className="co-card">
            <legend>
              <span className="n">2</span>Entrega
            </legend>
            <p className="field-label">Método de envío *</p>
            <div className="radio-cards">
              {options.map((o) => (
                <label className={`rc${o.id === shippingId ? ' is-on' : ''}`} key={o.id}>
                  <input
                    type="radio"
                    name="shipping"
                    value={o.id}
                    checked={o.id === shippingId}
                    onChange={() => setShippingId(o.id)}
                  />
                  <span className="rc-body">
                    <strong>{o.name}</strong>
                    <small>{o.detail}</small>
                  </span>
                  <span className="rc-price">
                    {shippingCostFor(config, o, subtotal) > 0
                      ? formatMoney(shippingCostFor(config, o, subtotal))
                      : 'Gratis'}
                  </span>
                </label>
              ))}
            </div>

            <div className="grid-3">
              <label className="field">
                Departamento *
                <select
                  name="department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Provincia
                <input
                  name="province"
                  defaultValue={old.province || (option?.local ? 'Coronel Portillo' : '')}
                  key={`prov-${option?.local}`}
                />
              </label>
              <label className="field">
                Distrito *
                <input
                  name="district"
                  required
                  placeholder={option?.local ? 'Callería, Yarinacocha, Manantay…' : ''}
                  defaultValue={old.district}
                />
              </label>
            </div>
            <label className="field">
              {option?.local ? 'Dirección de entrega *' : 'Dirección o agencia de destino *'}
              <input
                name="address"
                required
                autoComplete="street-address"
                placeholder={option?.local ? 'Jr./Av., número' : 'Ej: Agencia Shalom Av. …'}
                defaultValue={old.address}
              />
            </label>
            <label className="field">
              Referencia
              <input name="reference" placeholder="Frente al parque, portón negro…" defaultValue={old.reference} />
            </label>
          </fieldset>

          <fieldset className="co-card">
            <legend>
              <span className="n">3</span>Pago
            </legend>
            <div className="pay-tabs" role="radiogroup" aria-label="Método de pago">
              {methods.map((m) => (
                <label className={`pay-tab${m === method ? ' is-on' : ''}`} key={m}>
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={m === method}
                    onChange={() => setMethod(m)}
                  />
                  <span>{PAYMENT_METHODS[m]}</span>
                </label>
              ))}
            </div>

            {method === 'yape' ? (
              <div className="yape-box">
                {config.payment.yapeQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={config.payment.yapeQr} alt="QR de Yape" className="qr" />
                ) : null}
                <div>
                  <p className="muted small">Yapea o plinea el monto exacto a:</p>
                  <p className="big-num">
                    <span>{config.payment.yapeNumber}</span>
                    <CopyButton value={config.payment.yapeNumber} />
                  </p>
                  {config.payment.yapeName ? (
                    <p>
                      <strong>{config.payment.yapeName}</strong>
                    </p>
                  ) : null}
                  <p className="to-pay">
                    Monto a pagar: <strong>{formatMoney(total)}</strong>
                  </p>
                </div>
              </div>
            ) : null}

            {method === 'transfer' ? (
              <div className="banks">
                {config.payment.banks.map((b, i) => (
                  <div className="bank" key={i}>
                    <strong>{b.bank}</strong>
                    {b.account ? (
                      <p>
                        Cuenta: <span>{b.account}</span> <CopyButton value={b.account} />
                      </p>
                    ) : null}
                    {b.cci ? (
                      <p>
                        CCI: <span>{b.cci}</span> <CopyButton value={b.cci} />
                      </p>
                    ) : null}
                    {b.holder ? <p className="muted small">Titular: {b.holder}</p> : null}
                  </div>
                ))}
                <p className="to-pay">
                  Monto a transferir: <strong>{formatMoney(total)}</strong>
                </p>
              </div>
            ) : null}

            {method === 'contraentrega' ? (
              <div className="cod-box">
                <IconCheck size={20} />
                <p>
                  Pagas <strong>{formatMoney(total)}</strong> al recibir tu pedido, en efectivo, Yape
                  o Plin. Te escribiremos por WhatsApp para coordinar la hora.
                </p>
              </div>
            ) : null}

            {method !== 'contraentrega' ? (
              <>
                <p className="muted small pay-note">{config.payment.instructions}</p>
                <VoucherField
                  required={voucherRequired}
                  voucherUrl={voucherUrl}
                  setVoucherUrl={setVoucherUrl}
                />
                <label className="field">
                  N.° de operación (opcional)
                  <input name="operation" defaultValue={old.operation} />
                </label>
              </>
            ) : null}

            <label className="field">
              Notas para tu pedido
              <textarea name="notes" rows={2} defaultValue={old.notes} placeholder="Ej: es para regalo" />
            </label>
            <label className="check">
              <input type="checkbox" name="terms" required defaultChecked={old.terms === 'on'} /> Acepto
              los{' '}
              <Link href="/terminos" target="_blank">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" target="_blank">
                política de privacidad
              </Link>
              .
            </label>
          </fieldset>
        </div>

        <aside className="co-summary">
          <div className="co-card sticky">
            <h2 className="h4">Resumen del pedido</h2>
            <div className="sum-items">
              {items.map((item) => (
                <div className="si" key={item.id}>
                  <div className="si-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" />
                    <b>{item.qty}</b>
                  </div>
                  <p>{item.name}</p>
                  <span>{formatMoney(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="sum-rows">
              <div className="row-between">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="row-between">
                <span>Envío</span>
                <span>{shipping > 0 ? formatMoney(shipping) : 'Gratis'}</span>
              </div>
              <div className="row-between total">
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>
            <SubmitButton disabled={!ready || items.length === 0} />
            <p className="muted small center">
              {method === 'contraentrega'
                ? 'Pagas al recibir. Te confirmamos por WhatsApp.'
                : 'Tu pedido se confirma cuando verificamos tu pago.'}
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
