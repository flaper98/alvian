'use client';

import { useEffect, useRef, useState } from 'react';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { formatMoney } from '@/lib/store-config';
import AddToCartButton from '../../_store/AddToCartButton';
import { IconMinus, IconPlus } from '../../_store/icons';
import WhatsAppIcon from '../../WhatsAppIcon';

/**
 * Compra del perfume. Si vende decants, primero se elige el tamaño: el frasco
 * completo o un decant (3, 5, 10 ml…); cada uno va al carrito como línea propia.
 */
export default function ProductPurchasePanel({ product: bottle, decants = [], bottleMl = null }) {
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const [size, setSize] = useState(null); // null = frasco completo; si no, ml del decant
  const panelRef = useRef(null);
  const decant = size == null ? null : decants.find((d) => d.ml === size);
  const product = decant
    ? {
        ...bottle,
        key: `${bottle.id}:${decant.ml}`,
        ml: decant.ml,
        name: `${bottle.name} · Decant ${decant.ml} ml`,
        price: decant.price,
      }
    : bottle;
  const maxQty = Math.max(1, Math.min(10, product.stock || 1));
  const total = product.price * quantity;

  // Barra fija inferior en móvil cuando el bloque de compra sale de la pantalla.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const consultHref = buildWhatsAppLink(
    `Hola, vengo desde su página web. Tengo una consulta sobre el perfume "${product.name}" (${formatMoney(product.price)}).`,
  );

  return (
    <>
      <div className="product-purchase" ref={panelRef}>
        {decants.length > 0 ? (
          <div className="size-picker" role="radiogroup" aria-label="Tamaño">
            {[{ ml: null, price: bottle.price }, ...decants].map((option) => {
              const active = option.ml === size;
              return (
                <button
                  key={option.ml ?? 'frasco'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`size-option${active ? ' is-on' : ''}`}
                  onClick={() => setSize(option.ml)}
                >
                  <span>{option.ml == null ? `Frasco${bottleMl ? ` ${bottleMl} ml` : ''}` : `Decant ${option.ml} ml`}</span>
                  <strong>{formatMoney(option.price)}</strong>
                </button>
              );
            })}
          </div>
        ) : null}
        {decant ? (
          <p className="size-note">
            Decant: perfume original fraccionado en un frasquito de vidrio con atomizador. Ideal para probarlo antes
            de comprar el frasco.
          </p>
        ) : null}
        <div className="purchase-row">
          <div className="qty qty-lg" aria-label="Cantidad">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Quitar uno"
              disabled={quantity <= 1}
            >
              <IconMinus size={18} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              aria-label="Agregar uno"
              disabled={quantity >= maxQty}
            >
              <IconPlus size={18} />
            </button>
          </div>
          <AddToCartButton
            product={product}
            qty={quantity}
            className="btn-gold btn-lg purchase-add"
            label={`Agregar · ${formatMoney(total)}`}
          />
        </div>
        <AddToCartButton
          product={product}
          qty={quantity}
          buyNow
          compact
          className="btn-dark btn-lg btn-block"
          label="Comprar ahora"
        />
        <a className="btn-wa-outline btn-block" href={consultHref} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={18} height={18} />
          ¿Dudas? Pregúntanos por WhatsApp
        </a>
      </div>

      <div className={`sticky-buy${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
        <div className="sticky-buy-info">
          <strong>{product.name}</strong>
          <span>{formatMoney(product.price)}</span>
        </div>
        <AddToCartButton product={product} qty={quantity} className="btn-gold" label="Agregar" />
      </div>
    </>
  );
}
