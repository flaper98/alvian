'use client';

import { useEffect, useRef, useState } from 'react';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { formatMoney } from '@/lib/store-config';
import AddToCartButton from '../../_store/AddToCartButton';
import { IconMinus, IconPlus } from '../../_store/icons';
import WhatsAppIcon from '../../WhatsAppIcon';

export default function ProductPurchasePanel({ product }) {
  const [quantity, setQuantity] = useState(1);
  const [showSticky, setShowSticky] = useState(false);
  const panelRef = useRef(null);
  const maxQty = Math.max(1, Math.min(10, product.stock || 1));
  const soldOut = product.stock <= 0;
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
    soldOut
      ? `Hola, vengo desde su página web. ¿Cuándo vuelve a haber stock de "${product.name}"?`
      : `Hola, vengo desde su página web. Tengo una consulta sobre el perfume "${product.name}" (${formatMoney(product.price)}).`,
  );

  return (
    <>
      <div className="product-purchase" ref={panelRef}>
        {soldOut ? (
          <>
            <button type="button" className="btn-gold btn-lg btn-block is-disabled" disabled>
              Agotado por ahora
            </button>
            <a className="btn-whatsapp btn-block btn-lg" href={consultHref} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={20} height={20} />
              Avísame cuando llegue
            </a>
          </>
        ) : (
          <>
            {product.stock <= 3 ? (
              <p className="low-stock">
                ¡Solo {product.stock === 1 ? 'queda 1 unidad' : `quedan ${product.stock} unidades`}!
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
          </>
        )}
      </div>

      {!soldOut ? (
        <div className={`sticky-buy${showSticky ? ' show' : ''}`} aria-hidden={!showSticky}>
          <div className="sticky-buy-info">
            <strong>{product.name}</strong>
            <span>{formatMoney(product.price)}</span>
          </div>
          <AddToCartButton
            product={product}
            qty={quantity}
            className="btn-gold"
            label="Agregar"
          />
        </div>
      ) : null}
    </>
  );
}
