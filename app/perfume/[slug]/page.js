import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { getStoreConfig, listPublicFaqs } from '@/lib/store-db';
import { formatMoney } from '@/lib/store-config';
import { slugify } from '@/lib/slug';
import PerfumeCard from '../../PerfumeCard';
import SiteFooter from '../../SiteFooter';
import WhatsAppFloatingButton from '../../WhatsAppFloatingButton';
import SiteHeader from '../../_store/SiteHeader';
import { HowToBuy, FaqSection } from '../../_store/sections';
import { toCartProduct, discountPercent } from '../../_store/product';
import { IconTruck, IconShield, IconLock, IconPlus } from '../../_store/icons';
import ProductGallery from './ProductGallery';
import ProductPurchasePanel from './ProductPurchasePanel';

// Se genera bajo demanda y se guarda en caché (máx. 60 s o hasta que el admin
// cambie algo).
export const revalidate = 60;

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
  // Relacionados: primero misma categoría y con stock.
  const related = perfume
    ? available
        .filter((p) => p.id !== perfume.id)
        .sort(
          (a, b) =>
            Number(b.category === perfume.category) - Number(a.category === perfume.category) ||
            Number(b.stock > 0) - Number(a.stock > 0),
        )
        .slice(0, 6)
    : [];
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
  const off = discountPercent(perfume);
  const [config, faqs] = await Promise.all([getStoreConfig(), listPublicFaqs()]);
  const paymentText =
    [
      config.payment.yapeEnabled ? 'Yape o Plin' : null,
      config.payment.transferEnabled ? 'transferencia' : null,
      config.payment.cashOnDeliveryEnabled ? 'contra entrega (Pucallpa)' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'WhatsApp';

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

      <SiteHeader />

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <Link href="/">Inicio</Link> <span>/</span> <Link href="/#catalogo">Fragancias</Link>{' '}
        <span>/</span> <span aria-current="page">{perfume.name}</span>
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
          {perfume.notes ? <p className="product-notes">Notas: {perfume.notes}</p> : null}
          <div className="product-price-row">
            <p className="product-detail-price">{formatMoney(perfume.price)}</p>
            {off ? (
              <>
                <s className="product-compare">{formatMoney(perfume.compare_price)}</s>
                <span className="product-off">Ahorras {formatMoney(perfume.compare_price - perfume.price)}</span>
              </>
            ) : null}
          </div>

          {perfume.description ? (
            <p className="product-detail-description">{perfume.description}</p>
          ) : null}

          <ProductPurchasePanel product={toCartProduct(perfume)} />

          <ul className="mini-trust">
            <li>
              <IconShield size={18} /> Perfume 100% original y sellado
            </li>
            <li>
              <IconTruck size={18} /> Entrega en Pucallpa y envíos a todo el Perú
            </li>
            <li>
              <IconLock size={18} /> Paga con {paymentText}
            </li>
          </ul>

          <div className="acc">
            <details>
              <summary>
                Envíos y entregas
                <span className="plus">
                  <IconPlus size={18} />
                </span>
              </summary>
              <div className="acc-b">
                <ul className="plain">
                  {config.shipping.options.map((o) => (
                    <li key={o.id}>
                      <strong>{o.name}</strong> — {o.detail} ·{' '}
                      {Number(o.price) > 0 ? formatMoney(o.price) : 'Gratis'}
                    </li>
                  ))}
                  {Number(config.shipping.freeFrom) > 0 ? (
                    <li>Envío gratis en compras desde {formatMoney(config.shipping.freeFrom)}.</li>
                  ) : null}
                </ul>
              </div>
            </details>
            <details>
              <summary>
                Formas de pago
                <span className="plus">
                  <IconPlus size={18} />
                </span>
              </summary>
              <div className="acc-b">
                <p>{config.payment.instructions}</p>
              </div>
            </details>
          </div>

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

      <HowToBuy compact />
      <FaqSection faqs={faqs} />

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
