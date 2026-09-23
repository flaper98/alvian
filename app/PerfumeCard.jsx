import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { formatMoney } from '@/lib/store-config';
import AddToCartButton from './_store/AddToCartButton';
import HoverVideo from './_store/HoverVideo';
import ProductImage from './_store/ProductImage';
import { toCartProduct, discountPercent, categoryLabel } from './_store/product';
import WhatsAppIcon from './WhatsAppIcon';

const NEW_DAYS = 30;

export default function PerfumeCard({ perfume, preload = false }) {
  const product = toCartProduct(perfume);
  const href = `/perfume/${product.slug}`;
  const message = `Hola, vengo desde su página web. ¿Me puede dar más información del perfume "${perfume.name}", por favor?`;
  const off = discountPercent(perfume);
  const stock = Number(perfume.stock) || 0;
  const soldOut = stock <= 0;
  const isNew =
    perfume.created_at &&
    Date.now() - new Date(perfume.created_at).getTime() < NEW_DAYS * 24 * 60 * 60 * 1000;
  const label = categoryLabel(perfume.category);

  return (
    <article className={`sf-card${soldOut ? ' is-soldout' : ''}`} data-hover-video={perfume.video_url ? '' : undefined}>
      <Link href={href} className="sf-card-media" aria-label={perfume.name}>
        <span className="sf-card-badges">
          {off ? <span className="sf-badge sf-badge-sale">-{off}%</span> : null}
          {soldOut ? (
            <span className="sf-badge sf-badge-muted">Agotado</span>
          ) : isNew ? (
            <span className="sf-badge">Nuevo</span>
          ) : null}
        </span>
        <ProductImage
          src={perfume.image_url}
          alt={`Perfume ${perfume.name} - Alvian Perfumes Pucallpa`}
          sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 290px"
          className="sf-card-img"
          preload={preload}
        />
        {perfume.video_url ? <HoverVideo src={perfume.video_url} className="sf-card-video" /> : null}
      </Link>
      <div className="sf-card-body">
        {label ? <p className="sf-card-cat">{label}</p> : null}
        <h3 className="sf-card-title">
          <Link href={href}>{perfume.name}</Link>
        </h3>
        {perfume.notes ? <p className="sf-card-notes">{perfume.notes}</p> : null}
        <p className="sf-card-price">
          <strong>{formatMoney(perfume.price)}</strong>
          {off ? <s>{formatMoney(perfume.compare_price)}</s> : null}
        </p>
        {!soldOut && stock <= 3 ? (
          <p className="sf-card-stock">
            {stock === 1 ? '¡Última unidad!' : `¡Últimas ${stock} unidades!`}
          </p>
        ) : null}
        <div className="sf-card-actions">
          <AddToCartButton product={product} className="sf-btn sf-btn-dark sf-btn-block" label="Agregar" />
          <a
            className="sf-icon-btn"
            href={buildWhatsAppLink(message)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Consultar ${perfume.name} por WhatsApp`}
            title="Consultar por WhatsApp"
          >
            <WhatsAppIcon width={18} height={18} />
          </a>
        </div>
      </div>
    </article>
  );
}
