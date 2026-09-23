'use client';

import { useCart } from './CartProvider';
import { IconBag } from './icons';

export default function CartButton() {
  const { count, setOpen, ready } = useCart();
  return (
    <button
      type="button"
      className="cart-btn"
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrito${count ? ` (${count} productos)` : ''}`}
    >
      <IconBag size={22} />
      {ready && count > 0 ? <span className="cart-count">{count}</span> : null}
    </button>
  );
}
