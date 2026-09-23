'use client';

import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { IconBag } from './icons';

/** Botón "Agregar al carrito". `product` = { id, name, price, image, slug, stock }. */
export default function AddToCartButton({
  product,
  qty = 1,
  className = 'btn-gold',
  label = 'Agregar al carrito',
  buyNow = false,
  compact = false,
}) {
  const { add } = useCart();
  const router = useRouter();
  const soldOut = Number(product.stock) <= 0;

  if (soldOut) {
    return (
      <button type="button" className={`${className} is-disabled`} disabled>
        Agotado
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        add(product, qty, { openDrawer: !buyNow });
        if (buyNow) router.push('/checkout');
      }}
    >
      {compact ? null : <IconBag size={18} />}
      {label}
    </button>
  );
}
