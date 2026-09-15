import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { slugify } from '@/lib/slug';
import PerfumeCard from '../../PerfumeCard';
import SiteNav from '../../SiteNav';
import WhatsAppFloatingButton from '../../WhatsAppFloatingButton';
import WhatsAppIcon from '../../WhatsAppIcon';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianperfumes.com';

async function getPerfume(slug) {
  let perfumes = [];
  try {
    perfumes = await listPerfumes();
  } catch (error) {
    return { perfume: null, related: [] };
  }
  const available = perfumes.filter((p) => Number(p.price) > 0);
  const perfume = available.find((p) => slugify(p.name) === slug) || null;
  const related = perfume ? available.filter((p) => p.id !== perfume.id).slice(0, 6) : [];
  return { perfume, related };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { perfume } = await getPerfume(slug);

  if (!perfume) {
    return { title: 'Perfume no encontrado' };
  }

  const description =
    perfume.description ||
    `Compra ${perfume.name} original en Alvian Perfumes, perfumería en Pucallpa. Entrega rápida por WhatsApp.`;

  return {
    title: perfume.name,
    description,
    alternates: { canonical: `/perfume/${slug}` },
    openGraph: {
      title: `${perfume.name} | Alvian Perfumes`,
      description,
      url: `/perfume/${slug}`,
      type: 'website',
      images: perfume.image_url ? [{ url: perfume.image_url }] : undefined,
    },
  };
}

export default async function PerfumePage({ params }) {
  const { slug } = await params;
  const { perfume, related } = await getPerfume(slug);

  if (!perfume) {
    notFound();
  }

  const whatsappHref = buildWhatsAppLink(
    `Hola, vengo desde su página web. ¿Me puede dar más información del perfume "${perfume.name}" (S/ ${Number(perfume.price).toFixed(2)}), por favor?`,
  );

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    image: perfume.image_url,
    description:
      perfume.description || `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa.`,
    sku: String(perfume.id),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PEN',
      price: Number(perfume.price).toFixed(2),
      availability:
        perfume.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      areaServed: 'Pucallpa',
      url: `${SITE_URL}/perfume/${slug}`,
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Fragancias', item: `${SITE_URL}/#catalogo` },
      { '@type': 'ListItem', position: 3, name: perfume.name, item: `${SITE_URL}/perfume/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <SiteNav />

      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <a href="/">Inicio</a> <span>/</span> <a href="/#catalogo">Fragancias</a> <span>/</span>{' '}
        <span aria-current="page">{perfume.name}</span>
      </nav>

      <section className="product-detail">
        <div className="product-detail-media">
          {perfume.video_url ? (
            <video
              src={perfume.video_url}
              poster={perfume.image_url}
              autoPlay
              muted
              loop
              playsInline
              className="product-detail-image"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={perfume.image_url}
              alt={`Perfume ${perfume.name} - Alvian Perfumes Pucallpa`}
              className="product-detail-image"
            />
          )}
        </div>
        <div className="product-detail-info">
          <h1>{perfume.name}</h1>
          <p className="product-detail-price">S/ {Number(perfume.price).toFixed(2)}</p>
          {perfume.description ? (
            <p className="product-detail-description">{perfume.description}</p>
          ) : null}
          <a
            className="btn-whatsapp btn-block"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon width={19} height={19} />
            Comprar por WhatsApp
          </a>
          <Link href="/#catalogo" className="btn-secondary product-detail-back">
            ← Ver más perfumes
          </Link>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="related-section">
          <h2 className="section-title">También te puede interesar</h2>
          <div className="catalog-grid">
            {related.map((p) => (
              <PerfumeCard key={p.id} perfume={p} />
            ))}
          </div>
        </section>
      ) : null}

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Alvian Perfumes · Perfumería en Pucallpa, Perú</p>
      </footer>

      <WhatsAppFloatingButton />
    </>
  );
}
