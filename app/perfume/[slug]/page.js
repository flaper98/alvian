import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { slugify } from '@/lib/slug';
import PerfumeCard from '../../PerfumeCard';
import SiteFooter from '../../SiteFooter';
import SiteNav from '../../SiteNav';
import WhatsAppFloatingButton from '../../WhatsAppFloatingButton';
import ProductGallery from './ProductGallery';
import ProductPurchasePanel from './ProductPurchasePanel';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';
const CATEGORY_LABELS = { hombre: 'Perfumes para hombre', mujer: 'Perfumes para mujer', unisex: 'Perfumes unisex' };
const CATEGORY_SHORT_LABELS = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };

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
    `Compra ${perfume.name} original en Alvian Perfumes, perfumería en Pucallpa. Entrega en Pucallpa y envíos a todo el Perú.`;

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

  const media = [];
  if (perfume.image_url) media.push({ type: 'image', src: perfume.image_url });
  if (perfume.video_url) media.push({ type: 'video', src: perfume.video_url, poster: perfume.image_url });

  const isNew =
    perfume.created_at &&
    Date.now() - new Date(perfume.created_at).getTime() < 30 * 24 * 60 * 60 * 1000;
  const inStock = Number(perfume.stock) > 0;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    image: perfume.image_url,
    description:
      perfume.description ||
      `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa, con envíos a todo el Perú.`,
    sku: String(perfume.id),
    ...(perfume.category ? { category: CATEGORY_LABELS[perfume.category] } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PEN',
      price: Number(perfume.price).toFixed(2),
      availability:
        perfume.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      areaServed: ['Pucallpa', 'PE'],
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

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <a href="/">Inicio</a> <span>/</span> <a href="/#catalogo">Fragancias</a> <span>/</span>{' '}
        <span aria-current="page">{perfume.name}</span>
      </nav>

      <section className="product-detail">
        <ProductGallery media={media} alt={`Perfume ${perfume.name} - Alvian Perfumes Pucallpa`} />

        <div className="product-detail-info">
          <div className="product-badges">
            <span className="badge badge-gold">Original</span>
            {isNew ? <span className="badge badge-gold">Nuevo</span> : null}
            {perfume.category ? (
              <span className="badge badge-gold">{CATEGORY_SHORT_LABELS[perfume.category]}</span>
            ) : null}
            <span className={`badge ${inStock ? 'badge-paid' : 'badge-pending'}`}>
              {inStock ? 'Disponible' : 'Agotado'}
            </span>
          </div>

          <h1>{perfume.name}</h1>
          <p className="product-detail-price">S/ {Number(perfume.price).toFixed(2)}</p>

          {perfume.description ? (
            <p className="product-detail-description">{perfume.description}</p>
          ) : null}

          <ProductPurchasePanel perfumeName={perfume.name} price={Number(perfume.price)} />

          <p className="product-reassurance">
            ✓ Perfume 100% original · ✓ Entrega en Pucallpa · ✓ Envíos a todo el Perú
          </p>

          <Link href="/#catalogo" className="btn-outline-pill product-detail-back">
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

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
