'use client';

import { useEffect } from 'react';
import { useCart } from './CartProvider';

/** Vacía el carrito una sola vez (después de confirmar un pedido). */
export default function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);
  return null;
}
