'use client';

import { useEffect } from 'react';

// Avisa a Google Tag Manager que hubo una compra, con el evento "purchase" de
// Google Analytics 4 (comercio electrónico). Lo usan Analytics y las
// conversiones de Merchant Center: item_id es el id del perfume, el mismo que
// el g:id del feed (/feed/google.xml). Se usa solo en "Pedido recibido".
// A diferencia del Pixel, no hace falta esperar a que cargue GTM: dataLayer es
// una cola que GTM lee al llegar.
export default function GooglePurchaseEvent({ order }) {
  useEffect(() => {
    if (!order) return;
    const key = `ga_purchase_${order.code}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // Sin sessionStorage (modo privado estricto): se envía igual.
    }

    window.dataLayer = window.dataLayer || [];
    // Limpia el ecommerce de un evento anterior, como recomienda Google.
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: order.code,
        value: order.subtotal,
        shipping: order.shipping,
        currency: 'PEN',
        items: order.items,
      },
    });
    try {
      sessionStorage.setItem(key, '1');
    } catch {
      // Ver arriba.
    }
  }, [order]);

  return null;
}
