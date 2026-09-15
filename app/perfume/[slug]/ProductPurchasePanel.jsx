'use client';

import { useState } from 'react';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppIcon from '../../WhatsAppIcon';

const QUANTITIES = Array.from({ length: 10 }, (_, i) => i + 1);

export default function ProductPurchasePanel({ perfumeName, price }) {
  const [quantity, setQuantity] = useState(1);

  const total = price * quantity;
  const message =
    quantity > 1
      ? `Hola, vengo desde su página web. Quiero ${quantity} unidades de "${perfumeName}" (S/ ${total.toFixed(2)} en total), ¿me confirman disponibilidad?`
      : `Hola, vengo desde su página web. ¿Me puede dar más información del perfume "${perfumeName}" (S/ ${total.toFixed(2)}), por favor?`;
  const whatsappHref = buildWhatsAppLink(message);

  return (
    <div className="product-purchase">
      <label className="product-qty-label">
        Cantidad
        <select
          className="product-qty-select"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        >
          {QUANTITIES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <a
        className="btn-whatsapp btn-block btn-lg"
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon width={20} height={20} />
        Comprar por WhatsApp · S/ {total.toFixed(2)}
      </a>
    </div>
  );
}
