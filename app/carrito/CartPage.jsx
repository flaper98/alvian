'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/store-config';
import { cartKey, useCart } from '../_store/CartProvider';
import { IconArrow, IconBag, IconCheck, IconLock, IconMinus, IconPlus, IconShield, IconTruck } from '../_store/icons';

/**
 * Carrito en página completa: tabla de productos con cantidades y un resumen
 * del pedido. Se compra sin registrarse: en el siguiente paso solo se piden
 * los datos de entrega.
 */
export default function CartPage({ shipping, freeFrom, payment }) {
  const { items, count, subtotal, ready, setQty, clear } = useCart();

  if (!ready) return <p className="muted">Cargando tu carrito…</p>;

  if (items.length === 0) {
    return (
      <div className="cart-page-empty">
        <IconBag size={44} />
        <h2>Tu carrito está vacío</h2>
        <p>Agrega tus fragancias favoritas y vuelve aquí para terminar tu compra.</p>
        <Link href="/#catalogo" className="btn-gold btn-lg">
          Ver la colección <IconArrow size={18} />
        </Link>
      </div>
    );
  }

  const missing = freeFrom > 0 ? Math.max(freeFrom - subtotal, 0) : 0;
  const progress = freeFrom > 0 ? Math.min(100, (subtotal / freeFrom) * 100) : 0;

  return (
    <div className="cart-page">
      <div className="cart-page-main">
        <div className="cart-table" role="table" aria-label="Productos en tu carrito">
          <div className="cart-table-head" role="row">
            <span role="columnheader">Producto</span>
            <span role="columnheader">Precio</span>
            <span role="columnheader">Cantidad</span>
            <span role="columnheader">Subtotal</span>
            <span role="columnheader">
              <span className="sr-only">Quitar</span>
            </span>
          </div>
          {items.map((item) => (
            <div className="cart-line" role="row" key={cartKey(item)}>
              <div className="cart-line-product" role="cell">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" />
                <div>
                  <Link href={`/perfume/${item.slug}`}>{item.name}</Link>
                  <small>{item.ml ? 'Frasquito de vidrio con atomizador' : 'Frasco completo'}</small>
                </div>
              </div>
              <span className="cart-line-price" role="cell" data-label="Precio">
                {formatMoney(item.price)}
              </span>
              <div className="cart-line-qty" role="cell" data-label="Cantidad">
                <div className="qty">
                  <button type="button" onClick={() => setQty(cartKey(item), item.qty - 1)} aria-label={`Quitar uno de ${item.name}`}>
                    <IconMinus size={16} />
                  </button>
                  <span aria-live="polite">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(cartKey(item), item.qty + 1)}
                    aria-label={`Agregar uno de ${item.name}`}
                    disabled={item.stock > 0 && item.qty >= item.stock}
                  >
                    <IconPlus size={16} />
                  </button>
                </div>
              </div>
              <strong className="cart-line-total" role="cell" data-label="Subtotal">
                {formatMoney(item.price * item.qty)}
              </strong>
              <span role="cell">
                <button type="button" className="cart-line-remove" onClick={() => setQty(cartKey(item), 0)} aria-label={`Quitar ${item.name}`}>
                  ×
                </button>
              </span>
            </div>
          ))}
        </div>
        <div className="cart-page-links">
          <Link href="/#catalogo" className="link-btn">
            ← Seguir comprando
          </Link>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              if (window.confirm('¿Vaciar el carrito?')) clear();
            }}
          >
            Vaciar carrito
          </button>
        </div>
      </div>

      <aside className="cart-summary" aria-label="Resumen del pedido">
        <h2>Resumen del pedido</h2>
        {freeFrom > 0 ? (
          <div className="free-ship">
            {missing > 0 ? (
              <span>
                Te faltan <strong>{formatMoney(missing)}</strong> para envío gratis
              </span>
            ) : (
              <span>
                <IconCheck size={16} /> ¡Tienes <strong>envío gratis</strong>!
              </span>
            )}
            <div className="free-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
        <dl className="cart-summary-rows">
          <div>
            <dt>
              Productos ({count} {count === 1 ? 'unidad' : 'unidades'})
            </dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div>
            <dt>Envío</dt>
            <dd className="muted">Lo eliges en el siguiente paso</dd>
          </div>
        </dl>
        <ul className="cart-summary-ship">
          {shipping.map((o) => (
            <li key={o.id}>
              <span>{o.name}</span>
              <span>{o.price > 0 && !(freeFrom > 0 && subtotal >= freeFrom) ? formatMoney(o.price) : 'Gratis'}</span>
            </li>
          ))}
        </ul>
        <div className="cart-summary-total">
          <span>Total productos</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
        <Link href="/checkout" className="btn-gold btn-block btn-lg">
          Continuar compra <IconArrow size={18} />
        </Link>
        <p className="cart-guest">
          <IconCheck size={14} /> Compra sin registrarte: solo te pedimos tus datos de entrega.
        </p>
        <ul className="cart-trust">
          <li>
            <IconLock size={16} /> Pago seguro {payment.yape ? 'con Yape o Plin' : ''}
            {payment.cod ? ' o contra entrega en Pucallpa' : ''}
          </li>
          <li>
            <IconTruck size={16} /> Envíos a todo el Perú
          </li>
          <li>
            <IconShield size={16} /> Fragancias auténticas y selladas
          </li>
        </ul>
        <div className="cart-pay-chips" aria-label="Métodos de pago">
          {payment.yape ? (
            <>
              <span className="sf-pay-chip sf-pay-yape">Yape</span>
              <span className="sf-pay-chip sf-pay-plin">Plin</span>
            </>
          ) : null}
          {payment.transfer ? <span className="sf-pay-chip">Transferencia</span> : null}
          {payment.cod ? <span className="sf-pay-chip">Contra entrega</span> : null}
        </div>
      </aside>
    </div>
  );
}
