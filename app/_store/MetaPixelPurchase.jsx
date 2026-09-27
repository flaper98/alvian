'use client';

import { useEffect } from 'react';

// Dispara el evento "Purchase" de Meta con el monto real del pedido, para que
// Meta pueda optimizar los anuncios hacia compradores de más valor (no solo
// contar que hubo una compra). Se usa solo en la página "Pedido recibido",
// justo después de crear el pedido.
export default function MetaPixelPurchase({ order }) {
  useEffect(() => {
    if (!order) return undefined;

    const key = `fbq_purchase_${order.code}`;
    if (sessionStorage.getItem(key)) return undefined;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (typeof window.fbq === 'function') {
        clearInterval(timer);
        window.fbq('track', 'Purchase', {
          value: Number(order.total) || 0,
          currency: 'PEN',
          content_type: 'product',
          content_ids: (order.items || []).map((item) => String(item.perfume_id || item.name)),
          contents: (order.items || []).map((item) => ({
            id: String(item.perfume_id || item.name),
            quantity: item.quantity,
            item_price: Number(item.unit_price) || 0,
          })),
          num_items: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        });
        sessionStorage.setItem(key, '1');
      } else if (attempts >= 20) {
        // ~10s: el Pixel no cargó (bloqueador de anuncios, sin conexión, etc.).
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [order]);

  return null;
}
