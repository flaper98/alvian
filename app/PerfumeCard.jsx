import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { slugify } from '@/lib/slug';
import WhatsAppIcon from './WhatsAppIcon';

export default function PerfumeCard({ perfume }) {
  const message = `Hola, vengo desde su página web. ¿Me puede dar más información del perfume "${perfume.name}", por favor?`;
  const href = `/perfume/${slugify(perfume.name)}`;

  return (
    <article className="perfume-card">
      <Link href={href} className="perfume-card-image-wrap">
        {perfume.video_url ? (
          <video
            className="perfume-card-image"
            src={perfume.video_url}
            poster={perfume.image_url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={perfume.image_url}
            alt={`Perfume ${perfume.name} - Alvian Perfumes Pucallpa`}
            loading="lazy"
            className="perfume-card-image"
          />
        )}
      </Link>
      <div className="perfume-card-body">
        <h3>
          <Link href={href}>{perfume.name}</Link>
        </h3>
        <p className="perfume-price">S/ {Number(perfume.price).toFixed(2)}</p>
        {perfume.description ? (
          <p className="perfume-description">{perfume.description}</p>
        ) : null}
        <a
          className="btn-whatsapp btn-block"
          href={buildWhatsAppLink(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon width={17} height={17} />
          Comprar por WhatsApp
        </a>
      </div>
    </article>
  );
}
