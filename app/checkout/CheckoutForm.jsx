'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import { placeOrderAction } from '@/lib/store-actions';
import {
  PHONE_PATTERN,
  PHONE_HINT,
  DOC_PATTERN,
  DOC_HINT,
  NAME_PATTERN,
  NAME_HINT,
  docError,
  emailError,
  keepDigits,
  nameError,
  phoneError,
} from '@/lib/customer-validation';
import {
  DEPARTMENTS,
  PAYMENT_METHODS,
  availablePaymentMethods,
  formatMoney,
  shippingCostFor,
} from '@/lib/store-config';
import { optimizedUrl } from '../SiteImage';
import { cartKey, useCart } from '../_store/CartProvider';
import {
  IconBag,
  IconChat,
  IconCheck,
  IconLock,
  IconMinus,
  IconPlus,
  IconShield,
  IconTruck,
  IconUpload,
} from '../_store/icons';

// Distritos de Pucallpa para el delivery (el resto del Perú va por agencia).
const PUCALLPA_DISTRICTS = ['Callería', 'Yarinacocha', 'Manantay'];

// Pestañas de pago: Yape y Plin van juntos (se paga a un mismo número).
const PAY_LABELS = { ...PAYMENT_METHODS, yape: 'Yape / Plin', transfer: 'Transferencia bancaria' };

/**
 * Tipo de entrega según la opción configurada en /admin/tienda: fuera de
 * Pucallpa es "provincia"; en Pucallpa, "recojo" si la opción es de recoger y
 * "pucallpa" (delivery) en los demás casos.
 */
function deliveryKind(option) {
  if (!option) return 'pucallpa';
  if (!option.local) return 'provincia';
  return /recoj|recog|retir/i.test(`${option.id} ${option.name}`) ? 'recojo' : 'pucallpa';
}

/** Lo mismo que revisa el servidor, campo por campo, para avisar junto a cada uno. */
function validate(form, { kind, voucherRequired, method, voucherUrl }) {
  const value = (name) => String(form.elements.namedItem(name)?.value || '').trim();
  const errors = {
    name: value('name') ? nameError(value('name')) : 'Escribe tu nombre y apellido.',
    phone: value('phone') ? phoneError(value('phone')) : 'Escribe tu celular de 9 dígitos.',
    email: emailError(value('email')),
  };
  if (kind === 'provincia') {
    errors.doc = docError(value('doc'), { required: true });
    errors.reference = value('reference').length < 3 ? 'Escribe la agencia de Shalom u Olva donde lo recoges.' : null;
    errors.department = DEPARTMENTS.includes(value('department')) ? null : 'Elige tu departamento.';
    errors.province = value('province').length < 3 ? 'Escribe tu provincia.' : null;
    errors.district = value('district').length < 3 ? 'Escribe tu distrito.' : null;
    errors.address = value('address').length < 5 ? 'Escribe tu dirección completa.' : null;
  }
  if (kind === 'pucallpa') {
    errors.district = value('district') ? null : 'Elige tu distrito.';
    errors.address = value('address').length < 5 ? 'Escribe tu dirección de entrega completa.' : null;
  }
  if (voucherRequired && method !== 'contraentrega' && !voucherUrl) {
    errors.voucher = 'Sube la captura de tu pago para continuar.';
  }
  if (!form.elements.namedItem('terms')?.checked) {
    errors.terms = 'Acepta los términos y la política de privacidad para continuar.';
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

function SubmitButton({ disabled, total }) {
  const { pending } = useFormStatus();
  return (
    <button className="ck-submit" type="submit" disabled={pending || disabled}>
      <IconLock size={20} />
      {pending ? 'Enviando pedido…' : `Confirmar pedido · ${formatMoney(total)}`}
    </button>
  );
}

/** "921590084" → "921 ••• 084": el número completo solo se copia, no queda a la vista. */
function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 7) return value;
  return `${digits.slice(0, 3)} ••• ${digits.slice(-3)}`;
}

function CopyButton({ value, label, onFail }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="ck-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value).replace(/\s/g, ''));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch (error) {
          setCopied(false);
          onFail?.();
        }
      }}
    >
      {copied ? '¡Copiado!' : label}
    </button>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p className="ck-error" id={id}>
      {message}
    </p>
  );
}

function VoucherField({ required, voucherUrl, setVoucherUrl, error }) {
  const [state, setState] = useState({ uploading: false, error: '', name: '', preview: '' });
  const inputRef = useRef(null);

  async function onChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setState((s) => ({ ...s, error: 'El archivo supera 6 MB. Elige una captura más liviana.' }));
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
    } catch (uploadError) {
      setVoucherUrl('');
      setState((s) => ({
        ...s,
        uploading: false,
        error: 'No se pudo subir la captura. Intenta de nuevo o envíala luego por WhatsApp.',
      }));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const message = state.error || error;
  return (
    <div className="ck-upload">
      <label className={`ck-upload-box${message ? ' is-invalid' : ''}${voucherUrl ? ' is-done' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onChange}
          aria-describedby={message ? 'err-voucher' : 'hint-voucher'}
        />
        {state.name ? (
          <span className="ck-upload-preview">
            {state.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.preview} alt="" width={56} height={56} />
            ) : null}
            <span>
              <strong>{state.name}</strong>
              <small>
                {state.uploading
                  ? 'Subiendo…'
                  : voucherUrl
                    ? '✓ Captura lista · toca para cambiarla'
                    : 'Toca para intentar de nuevo'}
              </small>
            </span>
          </span>
        ) : (
          <span className="ck-upload-empty">
            <IconUpload size={26} />
            <strong>Sube la captura de tu pago{required ? '' : ' (opcional)'}</strong>
            <small id="hint-voucher">JPG, PNG o PDF · máx. 6 MB</small>
          </span>
        )}
      </label>
      <FieldError id="err-voucher" message={message} />
    </div>
  );
}

/** Lista del resumen: foto, nombre, cantidad (− / +) y subtotal de cada perfume. */
function SummaryItems({ items, setQty }) {
  return (
    <ul className="ck-items">
      {items.map((item) => (
        <li className="ck-item" key={cartKey(item)}>
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={optimizedUrl(item.image, 128)} alt="" width={64} height={64} loading="lazy" />
          ) : (
            <span className="ck-item-noimg" aria-hidden="true" />
          )}
          <div className="ck-item-info">
            <p>{item.name}</p>
            <div className="ck-qty" role="group" aria-label={`Cantidad de ${item.name}`}>
              <button
                type="button"
                onClick={() => setQty(cartKey(item), item.qty - 1)}
                disabled={item.qty <= 1}
                aria-label={`Quitar uno de ${item.name}`}
              >
                <IconMinus size={18} />
              </button>
              <span aria-live="polite">{item.qty}</span>
              <button
                type="button"
                onClick={() => setQty(cartKey(item), item.qty + 1)}
                disabled={item.stock > 0 && item.qty >= item.stock}
                aria-label={`Agregar uno de ${item.name}`}
              >
                <IconPlus size={18} />
              </button>
              <button type="button" className="ck-item-remove" onClick={() => setQty(cartKey(item), 0)}>
                Quitar
              </button>
            </div>
          </div>
          <strong className="ck-item-total">{formatMoney(item.price * item.qty)}</strong>
        </li>
      ))}
    </ul>
  );
}

function Totals({ subtotal, shipping, total }) {
  return (
    <dl className="ck-totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(subtotal)}</dd>
      </div>
      <div>
        <dt>Envío</dt>
        <dd>{shipping > 0 ? formatMoney(shipping) : <span className="pill-free">Gratis</span>}</dd>
      </div>
      <div className="ck-total">
        <dt>Total</dt>
        <dd>{formatMoney(total)}</dd>
      </div>
    </dl>
  );
}

export default function CheckoutForm({ config }) {
  const { items, subtotal, ready, setQty } = useCart();
  const [state, formAction] = useActionState(placeOrderAction, { error: null });
  const old = state?.fields || {};
  const options = config.shipping.options;

  const [shippingId, setShippingId] = useState(old.shipping || options[0]?.id || '');
  const option = options.find((o) => o.id === shippingId) || options[0];
  const kind = deliveryKind(option);
  const methods = useMemo(() => availablePaymentMethods(config, option), [config, option]);
  const [method, setMethod] = useState(old.method || methods[0] || '');
  // Si el navegador no deja copiar, se muestra el número completo para que lo escriban.
  const [showYapeNumber, setShowYapeNumber] = useState(false);
  const [voucherUrl, setVoucherUrl] = useState(old.voucherUrl || '');
  const [department, setDepartment] = useState(old.department || (kind === 'provincia' ? '' : 'Ucayali'));
  const [errors, setErrors] = useState({});
  const previousKind = useRef(kind);
  const alertRef = useRef(null);

  // Si el método elegido deja de estar disponible (p. ej. contra entrega fuera
  // de Pucallpa), se cambia al primero disponible.
  useEffect(() => {
    if (!methods.includes(method)) setMethod(methods[0] || '');
  }, [methods, method]);

  // En Pucallpa el departamento es Ucayali; al pasar a provincia se elige de nuevo.
  useEffect(() => {
    if (kind !== 'provincia') setDepartment('Ucayali');
    else if (previousKind.current !== 'provincia') setDepartment('');
    previousKind.current = kind;
  }, [kind]);

  useEffect(() => {
    if (voucherUrl) setErrors((current) => ({ ...current, voucher: undefined }));
  }, [voucherUrl]);

  // Error del servidor (p. ej. stock o envío): se muestra arriba y se lleva la vista ahí.
  useEffect(() => {
    if (state?.error) alertRef.current?.focus();
  }, [state]);

  const shipping = shippingCostFor(config, option, subtotal);
  const total = subtotal + shipping;
  const voucherRequired = config.payment.voucherRequired && method !== 'contraentrega';
  const cartJson = JSON.stringify(items.map((i) => ({ id: i.id, qty: i.qty, ml: i.ml || null })));
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  // Props comunes de accesibilidad para cada campo con su mensaje de error.
  const a11y = (name, hintId) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `err-${name}` : hintId,
  });

  function onSubmit(event) {
    const found = validate(event.currentTarget, { kind, voucherRequired, method, voucherUrl });
    if (Object.keys(found).length === 0) return;
    event.preventDefault();
    setErrors(found);
    const first = Object.keys(found)[0];
    const target =
      first === 'voucher'
        ? event.currentTarget.querySelector('.ck-upload input')
        : event.currentTarget.elements.namedItem(first);
    if (target && typeof target.focus === 'function') target.focus();
  }

  // Al corregir un campo, su mensaje de error desaparece.
  function onInput(event) {
    const name = event.target?.name;
    if (name && errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  }

  if (ready && items.length === 0) {
    return (
      <div className="ck-empty">
        <IconBag size={44} />
        <h2>Tu carrito está vacío</h2>
        <p>Agrega tus fragancias favoritas para continuar con tu compra.</p>
        <Link href="/#catalogo" className="ck-btn">
          Ver la colección
        </Link>
      </div>
    );
  }

  return (
    <form className="ck-grid" action={formAction} onSubmit={onSubmit} onInput={onInput} noValidate>
      <input type="hidden" name="cart" value={cartJson} />
      <input type="hidden" name="voucherUrl" value={voucherUrl} />
      <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {/* Celular: el resumen va arriba, plegado, con el total a la vista. */}
      <details className="ck-mobile-sum">
        <summary>
          <span>
            <IconBag size={18} /> Ver resumen ({count} {count === 1 ? 'producto' : 'productos'})
          </span>
          <strong>{formatMoney(total)}</strong>
        </summary>
        <div className="ck-mobile-sum-body">
          <SummaryItems items={items} setQty={setQty} />
          <Totals subtotal={subtotal} shipping={shipping} total={total} />
        </div>
      </details>

      <div className="ck-main">
        {state?.error ? (
          <div className="ck-alert" role="alert" tabIndex={-1} ref={alertRef}>
            <strong>No pudimos confirmar tu pedido.</strong> {state.error}
          </div>
        ) : null}

        <section className="ck-card" aria-labelledby="ck-s1">
          <h2 className="ck-card-title" id="ck-s1">
            <span className="ck-num">1</span>¿Cómo te contactamos?
          </h2>
          <label className="ck-field">
            <span className="ck-label">Nombre completo</span>
            <input
              name="name"
              autoComplete="name"
              pattern={NAME_PATTERN}
              title={NAME_HINT}
              maxLength={120}
              placeholder="Nombre y apellido"
              defaultValue={old.name}
              {...a11y('name')}
            />
            <FieldError id="err-name" message={errors.name} />
          </label>
          <label className="ck-field">
            <span className="ck-label">Celular (WhatsApp)</span>
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              pattern={PHONE_PATTERN}
              title={PHONE_HINT}
              maxLength={9}
              placeholder="987654321"
              onInput={(event) => keepDigits(event, 9)}
              defaultValue={old.phone}
              {...a11y('phone', 'hint-phone')}
            />
            <span className="ck-hint" id="hint-phone">
              Aquí te confirmamos tu pedido.
            </span>
            <FieldError id="err-phone" message={errors.phone} />
          </label>
          <label className="ck-field">
            <span className="ck-label">
              Correo <span className="ck-optional">(opcional)</span>
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={120}
              placeholder="tucorreo@ejemplo.com"
              defaultValue={old.email}
              {...a11y('email')}
            />
            <FieldError id="err-email" message={errors.email} />
          </label>
        </section>

        <section className="ck-card" aria-labelledby="ck-s2">
          <h2 className="ck-card-title" id="ck-s2">
            <span className="ck-num">2</span>¿Cómo lo recibes?
          </h2>
          <div className="ck-options" role="radiogroup" aria-label="Forma de entrega">
            {options.map((o) => {
              const cost = shippingCostFor(config, o, subtotal);
              return (
                <label className={`ck-option${o.id === shippingId ? ' is-on' : ''}`} key={o.id}>
                  <input
                    type="radio"
                    name="shipping"
                    value={o.id}
                    checked={o.id === shippingId}
                    onChange={() => setShippingId(o.id)}
                  />
                  <span className="ck-option-body">
                    <strong>{o.name}</strong>
                    {o.detail ? <small>{o.detail}</small> : null}
                  </span>
                  {cost > 0 ? (
                    <span className="pill-cost">{formatMoney(cost)}</span>
                  ) : (
                    <span className="pill-free">Gratis</span>
                  )}
                </label>
              );
            })}
          </div>

          {kind === 'pucallpa' ? (
            <div className="ck-fields" key="pucallpa">
              <input type="hidden" name="department" value="Ucayali" />
              <input type="hidden" name="province" value="Coronel Portillo" />
              <p className="ck-fixed">
                <IconCheck size={16} />
                <span>
                  Entrega en <strong>Pucallpa</strong> · Ucayali, Coronel Portillo
                </span>
              </p>
              <label className="ck-field">
                <span className="ck-label">Distrito</span>
                <select name="district" defaultValue={old.district || ''} {...a11y('district')}>
                  <option value="" disabled>
                    Elige tu distrito
                  </option>
                  {[...new Set([...PUCALLPA_DISTRICTS, ...(old.district ? [old.district] : [])])].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <FieldError id="err-district" message={errors.district} />
              </label>
              <label className="ck-field">
                <span className="ck-label">Dirección</span>
                <input
                  name="address"
                  minLength={5}
                  maxLength={250}
                  autoComplete="street-address"
                  placeholder="Jr./Av., número"
                  defaultValue={old.address}
                  {...a11y('address')}
                />
                <FieldError id="err-address" message={errors.address} />
              </label>
              <label className="ck-field">
                <span className="ck-label">
                  Referencia <span className="ck-optional">(opcional)</span>
                </span>
                <input
                  name="reference"
                  maxLength={250}
                  placeholder="Frente al parque, portón negro…"
                  defaultValue={old.reference}
                />
              </label>
            </div>
          ) : null}

          {kind === 'provincia' ? (
            <div className="ck-fields" key="provincia">
              <label className="ck-field">
                <span className="ck-label">DNI o carné de extranjería</span>
                <input
                  name="doc"
                  inputMode="numeric"
                  pattern={DOC_PATTERN}
                  title={DOC_HINT}
                  maxLength={12}
                  placeholder="8 dígitos"
                  onInput={(event) => keepDigits(event, 12)}
                  defaultValue={old.doc}
                  {...a11y('doc', 'hint-doc')}
                />
                <span className="ck-hint" id="hint-doc">
                  Lo piden Shalom y Olva para entregarte el paquete.
                </span>
                <FieldError id="err-doc" message={errors.doc} />
              </label>
              <label className="ck-field">
                <span className="ck-label">Agencia de Shalom u Olva</span>
                <input
                  name="reference"
                  maxLength={250}
                  placeholder="Ej: Shalom Av. Grau, Lima"
                  defaultValue={old.reference}
                  {...a11y('reference', 'hint-agency')}
                />
                <span className="ck-hint" id="hint-agency">
                  La agencia más cercana donde recoges tu pedido.
                </span>
                <FieldError id="err-reference" message={errors.reference} />
              </label>
              <div className="ck-row">
                <label className="ck-field">
                  <span className="ck-label">Departamento</span>
                  <select
                    name="department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    {...a11y('department')}
                  >
                    <option value="" disabled>
                      Elige tu departamento
                    </option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <FieldError id="err-department" message={errors.department} />
                </label>
                <label className="ck-field">
                  <span className="ck-label">Provincia</span>
                  <input name="province" maxLength={80} defaultValue={old.province} {...a11y('province')} />
                  <FieldError id="err-province" message={errors.province} />
                </label>
              </div>
              <label className="ck-field">
                <span className="ck-label">Distrito</span>
                <input name="district" maxLength={80} defaultValue={old.district} {...a11y('district')} />
                <FieldError id="err-district" message={errors.district} />
              </label>
              <label className="ck-field">
                <span className="ck-label">Dirección</span>
                <input
                  name="address"
                  maxLength={250}
                  autoComplete="street-address"
                  placeholder="Jr./Av., número"
                  defaultValue={old.address}
                  {...a11y('address')}
                />
                <FieldError id="err-address" message={errors.address} />
              </label>
            </div>
          ) : null}

          {kind === 'recojo' ? (
            <div className="ck-fields" key="recojo">
              {/* El servidor pide distrito y dirección: en el recojo se completan solos. */}
              <input type="hidden" name="department" value="Ucayali" />
              <input type="hidden" name="province" value="Coronel Portillo" />
              <input type="hidden" name="district" value="Pucallpa" />
              <input type="hidden" name="address" value="Recojo coordinado por WhatsApp" />
              <p className="ck-note">
                <IconChat size={18} />
                <span>
                  No necesitas dirección: te escribimos por WhatsApp para coordinar el lugar y la hora del recojo en
                  Pucallpa.
                </span>
              </p>
            </div>
          ) : null}
        </section>

        <section className="ck-card" aria-labelledby="ck-s3">
          <h2 className="ck-card-title" id="ck-s3">
            <span className="ck-num">3</span>¿Cómo pagas?
          </h2>
          <div className="ck-tabs" role="radiogroup" aria-label="Forma de pago">
            {methods.map((m) => (
              <label className={`ck-tab${m === method ? ' is-on' : ''}`} key={m}>
                <input type="radio" name="method" value={m} checked={m === method} onChange={() => setMethod(m)} />
                <span>{PAY_LABELS[m] || m}</span>
              </label>
            ))}
          </div>

          {method === 'yape' ? (
            <div className="ck-yape">
              <div className="ck-yape-info">
                <p className="ck-yape-label">Yapea o plinea al número</p>
                <p className="ck-yape-number">
                  {showYapeNumber ? config.payment.yapeNumber : maskPhone(config.payment.yapeNumber)}
                </p>
                <CopyButton
                  value={config.payment.yapeNumber}
                  label="Copiar número"
                  onFail={() => setShowYapeNumber(true)}
                />
                {config.payment.yapeName ? (
                  <p className="ck-yape-holder">
                    Titular: <strong>{config.payment.yapeName}</strong>
                  </p>
                ) : null}
                <div className="ck-yape-amount">
                  <span>Monto exacto</span>
                  <strong>{formatMoney(total)}</strong>
                  <CopyButton value={total.toFixed(2)} label="Copiar monto" />
                </div>
              </div>
              {config.payment.yapeQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={config.payment.yapeQr}
                  alt="Código QR de Yape de Alvian Perfumes"
                  className="ck-yape-qr"
                  width={160}
                  height={160}
                />
              ) : null}
            </div>
          ) : null}

          {method === 'transfer' ? (
            <div className="ck-banks">
              {config.payment.banks.map((b, i) => (
                <div className="ck-bank" key={i}>
                  <strong>{b.bank}</strong>
                  {b.account ? (
                    <p>
                      Cuenta: <span>{b.account}</span> <CopyButton value={b.account} label="Copiar" />
                    </p>
                  ) : null}
                  {b.cci ? (
                    <p>
                      CCI: <span>{b.cci}</span> <CopyButton value={b.cci} label="Copiar" />
                    </p>
                  ) : null}
                  {b.holder ? <p className="ck-hint">Titular: {b.holder}</p> : null}
                </div>
              ))}
              <div className="ck-yape-amount">
                <span>Monto a transferir</span>
                <strong>{formatMoney(total)}</strong>
                <CopyButton value={total.toFixed(2)} label="Copiar monto" />
              </div>
            </div>
          ) : null}

          {method === 'contraentrega' ? (
            <div className="ck-cod">
              <IconCheck size={20} />
              <p>
                Pagas <strong>{formatMoney(total)}</strong> al recibir tu pedido, en efectivo, Yape o Plin. Te escribimos
                por WhatsApp para coordinar la hora.
              </p>
            </div>
          ) : null}

          {method !== 'contraentrega' ? (
            <>
              {config.payment.instructions ? <p className="ck-hint">{config.payment.instructions}</p> : null}
              <VoucherField
                required={voucherRequired}
                voucherUrl={voucherUrl}
                setVoucherUrl={setVoucherUrl}
                error={errors.voucher}
              />
              <label className="ck-field">
                <span className="ck-label">
                  N.º de operación <span className="ck-optional">(opcional)</span>
                </span>
                <input name="operation" maxLength={60} defaultValue={old.operation} />
              </label>
            </>
          ) : null}

          <details className="ck-notes" open={Boolean(old.notes)}>
            <summary>¿Es para regalo o quieres dejar una nota?</summary>
            <label className="ck-field">
              <span className="ck-label">Nota para tu pedido</span>
              <textarea name="notes" rows={3} maxLength={500} defaultValue={old.notes} placeholder="Ej: es para regalo" />
            </label>
          </details>
        </section>
      </div>

      <aside className="ck-summary" aria-label="Resumen del pedido">
        <div className="ck-card ck-summary-card">
          <h2 className="ck-summary-title">Resumen del pedido</h2>
          <div className="ck-summary-items">
            {ready ? <SummaryItems items={items} setQty={setQty} /> : <p className="ck-hint">Cargando tu carrito…</p>}
          </div>
          <Totals subtotal={subtotal} shipping={shipping} total={total} />
          <label className={`ck-terms${errors.terms ? ' is-invalid' : ''}`}>
            <input
              type="checkbox"
              name="terms"
              defaultChecked={old.terms === 'on'}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? 'err-terms' : undefined}
            />
            <span>
              Acepto los{' '}
              <Link href="/terminos" target="_blank">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" target="_blank">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          <FieldError id="err-terms" message={errors.terms} />
          <SubmitButton disabled={!ready || items.length === 0} total={total} />
          <p className="ck-confirm-note">
            {method === 'contraentrega'
              ? 'Pagas al recibir. Te confirmamos por WhatsApp.'
              : 'Tu pedido se confirma cuando verificamos tu pago.'}
          </p>
          <ul className="ck-trust">
            <li>
              <IconChat size={18} /> Te confirmamos por WhatsApp
            </li>
            <li>
              <IconShield size={18} /> Fragancias auténticas y selladas
            </li>
            <li>
              <IconTruck size={18} /> Envíos a todo el Perú
            </li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
