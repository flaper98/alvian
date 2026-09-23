'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatMoney } from '@/lib/store-config';
import { useCart } from './CartProvider';
import { IconBag, IconClose, IconMinus, IconPlus, IconArrow, IconCheck } from './icons';

export default function CartDrawer({ freeFrom = 0 }) {
  const { items, subtotal, open, setOpen, setQty, toast } = useCart();
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, setOpen]);

  // Al navegar (p. ej. ir al checkout) se cierra solo.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  if (isAdmin) return null;

  const missing = freeFrom > 0 ? freeFrom - subtotal : 0;
  const progress = freeFrom > 0 ? Math.min(100, (subtotal / freeFrom) * 100) : 0;

  return (
    <>
      <div
        className={`drawer-backdrop${open ? ' show' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${open ? ' open' : ''}`}
        aria-label="Carrito de compras"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="drawer-head">
          <h2>Tu carrito</h2>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar carrito">
            <IconClose size={22} />
          </button>
        </div>

        {items.length > 0 && freeFrom > 0 ? (
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

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <IconBag size={40} />
              <p>Tu carrito está vacío.</p>
              <button type="button" className="btn-gold" onClick={() => setOpen(false)}>
                Seguir viendo perfumes
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div className="ci" key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ci-img" src={item.image} alt="" />
                <div className="ci-info">
                  <Link href={`/perfume/${item.slug}`} className="ci-name">
                    {item.name}
                  </Link>
                  <p className="ci-unit">{formatMoney(item.price)} c/u</p>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(item.id, item.qty - 1)} aria-label={`Quitar uno de ${item.name}`}>
                      <IconMinus size={16} />
                    </button>
                    <span aria-live="polite">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.id, item.qty + 1)}
                      aria-label={`Agregar uno de ${item.name}`}
                      disabled={item.stock > 0 && item.qty >= item.stock}
                    >
                      <IconPlus size={16} />
                    </button>
                  </div>
                </div>
                <div className="ci-side">
                  <strong>{formatMoney(item.price * item.qty)}</strong>
                  <button type="button" className="ci-remove" onClick={() => setQty(item.id, 0)}>
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 ? (
          <div className="drawer-foot">
            <div className="row-between">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <p className="muted small">El envío se calcula en el siguiente paso.</p>
            <Link href="/checkout" className="btn-gold btn-block btn-lg">
              Finalizar compra <IconArrow size={18} />
            </Link>
            <button type="button" className="link-btn" onClick={() => setOpen(false)}>
              Seguir comprando
            </button>
          </div>
        ) : null}
      </aside>

      <div className={`store-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
