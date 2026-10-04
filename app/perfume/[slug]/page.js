import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { getStoreConfig, listPublicFaqs } from '@/lib/store-db';
import { formatMoney } from '@/lib/store-config';
import { slugify } from '@/lib/slug';
import { brandSlug, perfumeBrand } from '@/lib/brands';
import { CATEGORY_PAGES, isInStore, metaDescription, jsonLdHtml, offerShippingAndReturns } from '@/lib/seo';
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
  const available = perfumes.filter(isInStore);
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

  // Lo que la gente busca: "Hawas Ice Rasasi original precio" → título con
  // marca, "Original" y precio; descripción comercial de ~155 caracteres.
  const brand = perfumeBrand(perfume);
  const fullName = brand && !new RegExp(`\\b${brand}\\b`, 'i').test(perfume.name) ? `${perfume.name} ${brand}` : perfume.name;
  const description = metaDescription(
    `Compra ${fullName} original a ${formatMoney(perfume.price)} en Alvian Perfumes, Pucallpa. Paga con Yape o Plin y recíbelo en todo el Perú.${
      perfume.notes ? ` Notas: ${perfume.notes}.` : ''
    }`,
  );

  return {
    title: `${fullName} Original – Precio en Perú`,
    description,
    alternates: { canonical: `/perfume/${slug}` },
    openGraph: {
      title: `${fullName} Original | Alvian Perfumes`,
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

  const brand = perfumeBrand(perfume);
  const categoryPage = CATEGORY_PAGES[perfume.category];
  // Migas de pan: Inicio / Perfumes árabes para hombre / Hawas Ice.
  const crumbs = [
    { name: 'Inicio', href: '/' },
    categoryPage
      ? { name: categoryPage.h1, href: `/perfumes/${perfume.category}` }
      : { name: 'Fragancias', href: '/#catalogo' },
    { name: perfume.name, href: `/perfume/${slug}` },
  ];

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: perfume.name,
    image: perfume.image_url,
    description:
      perfume.description ||
      `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa, con envíos a todo el Perú.`,
    sku: String(perfume.id),
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    ...(perfume.category ? { category: CATEGORY_LABELS[perfume.category] } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PEN',
      price: Number(perfume.price).toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      areaServed: ['Pucallpa', 'PE'],
      url: `${SITE_URL}/perfume/${slug}`,
      seller: { '@type': 'Organization', name: 'Alvian Perfumes', url: SITE_URL },
      ...offerShippingAndReturns(config),
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }}
      />

      <SiteHeader />

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <Link href="/">Inicio</Link> <span>/</span> <Link href={crumbs[1].href}>{crumbs[1].name}</Link>{' '}
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
            <span className="badge badge-paid">Disponible</span>
          </div>

          {brand ? (
            <Link href={`/marca/${brandSlug(brand)}`} className="product-brand">
              {brand}
            </Link>
          ) : null}
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

          <Link href={crumbs[1].href} className="btn-outline-pill product-detail-back">
            ← Ver más {categoryPage ? categoryPage.h1.toLowerCase() : 'perfumes'}
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
