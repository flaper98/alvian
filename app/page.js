import Link from 'next/link';
import { listPerfumes, listHeroBanners } from '@/lib/db';
import { listPublicFaqs, listTestimonials } from '@/lib/store-db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { slugify } from '@/lib/slug';
import BrandMarquee from './BrandMarquee';
import HeroCarousel from './HeroCarousel';
import PerfumeCard from './PerfumeCard';
import PerfumeCatalog from './PerfumeCatalog';
import SiteFooter from './SiteFooter';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import WhatsAppIcon from './WhatsAppIcon';
import SiteHeader from './_store/SiteHeader';
import CategoryCards from './_store/CategoryCards';
import Reels from './_store/Reels';
import { IconArrow } from './_store/icons';
import {
  TrustBadges,
  TrustBar,
  SectionHead,
  Statement,
  WhyAlvian,
  HowToBuy,
  Testimonials,
  GiftSection,
  FaqSection,
} from './_store/sections';

const CATEGORY_CARDS = [
  {
    value: 'hombre',
    title: 'Para él',
    eyebrow: 'Intensos · Elegantes',
    text: 'Amaderados, especiados y frescos que se notan desde lejos.',
  },
  {
    value: 'mujer',
    title: 'Para ella',
    eyebrow: 'Dulces · Florales',
    text: 'Frutales y gourmand que dejan huella por donde pasas.',
  },
  {
    value: 'unisex',
    title: 'Unisex',
    eyebrow: 'Para compartir',
    text: 'Orientales y cálidos, perfectos para cualquier ocasión.',
  },
];

// La portada se sirve desde caché y se regenera como máximo cada 60 s (o al
// instante cuando el admin cambia algo, vía revalidatePath). Así carga rápido
// aunque la base de datos esté "dormida".
export const revalidate = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';
const CATEGORY_LABELS = { hombre: 'Perfumes para hombre', mujer: 'Perfumes para mujer', unisex: 'Perfumes unisex' };

async function safe(promise, fallback) {
  try {
    return await promise;
  } catch (error) {
    return fallback;
  }
}

export default async function HomePage() {
  const [allPerfumes, heroBanners, faqs, reviews] = await Promise.all([
    safe(listPerfumes(), []),
    safe(listHeroBanners({ onlyActive: true }), []),
    listPublicFaqs(),
    listTestimonials({ onlyActive: true }),
  ]);

  // Un producto recién creado empieza sin precio (se define al registrar la
  // primera compra), así que no se muestra en la tienda hasta tener precio.
  const perfumes = allPerfumes
    .filter((perfume) => Number(perfume.price) > 0)
    .sort((a, b) => {
      // Primero los que tienen stock, luego por nombre.
      const stockDiff = Number(b.stock > 0) - Number(a.stock > 0);
      return stockDiff || a.name.localeCompare(b.name, 'es');
    });

  const inStock = perfumes.filter((p) => p.stock > 0);
  const featured = inStock.filter((p) => p.featured).slice(0, 4);

  // Tarjetas de categoría: usan la foto de un destacado (o del primero con
  // stock) de esa categoría. Una categoría sin perfumes no se muestra.
  const categories = CATEGORY_CARDS.map((cat) => {
    const list = perfumes.filter((p) => p.category === cat.value);
    const cover =
      list.find((p) => p.featured && p.stock > 0) || list.find((p) => p.stock > 0) || list[0];
    return { ...cat, count: list.length, image: cover?.image_url || null };
  }).filter((cat) => cat.count > 0);

  // Perfumes con video: el primero va en "Por qué Alvian"; el resto, en la
  // tira de videos. Se priorizan los que tienen stock.
  const withVideo = [...perfumes]
    .filter((p) => p.video_url)
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
    .map((p) => ({ ...p, slug: slugify(p.name) }));
  const spotlight = withVideo[0] || (featured[0] && { ...featured[0], slug: slugify(featured[0].name) });
  const reels = withVideo.slice(1, 7);
  const giftPick = featured[1] || featured[0] || inStock[0] || null;
  const fromPrice = perfumes.length
    ? Math.min(...perfumes.map((p) => Number(p.price)))
    : null;

  const whatsappHref = buildWhatsAppLink(
    'Hola, vengo desde su página web. ¿Me puede dar más información sobre sus perfumes, por favor?',
  );

  const productsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: perfumes.map((perfume, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: perfume.name,
        image: perfume.image_url,
        description:
          perfume.description ||
          `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa, con envíos a todo el Perú.`,
        url: `${SITE_URL}/perfume/${slugify(perfume.name)}`,
        ...(perfume.category ? { category: CATEGORY_LABELS[perfume.category] } : {}),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PEN',
          price: Number(perfume.price).toFixed(2),
          availability:
            perfume.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          areaServed: ['Pucallpa', 'PE'],
        },
      },
    })),
  };

  return (
    <>
      {perfumes.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productsJsonLd) }}
        />
      ) : null}

      <SiteHeader />

      <header id="inicio" className="sf-hero">
        {heroBanners.length > 0 ? (
          <HeroCarousel slides={heroBanners} />
        ) : (
          <div className="sf-hero-plain">
            <div className="sf-wrap sf-hero-plain-in">
              <p className="sf-eyebrow">Perfumería árabe en Pucallpa</p>
              <h1 className="sf-display">
                Fragancias que <em>se quedan</em> en la memoria.
              </h1>
              <p className="sf-lead">
                Perfumes árabes 100% originales de Lattafa, Armaf, Rasasi y Afnan. Compra en
                minutos, paga con Yape o Plin y recíbelo en casa.
                {fromPrice ? ` Desde S/ ${fromPrice.toFixed(0)}.` : ''}
              </p>
              <div className="sf-actions">
                <Link href="/#catalogo" className="sf-btn sf-btn-gold sf-btn-lg">
                  Ver perfumes <IconArrow size={18} />
                </Link>
                <a
                  className="sf-btn sf-btn-outline-light sf-btn-lg"
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon width={18} height={18} /> Asesoría gratis
                </a>
              </div>
              <TrustBadges />
            </div>
          </div>
        )}
      </header>

      <TrustBar />

      {categories.length > 1 ? (
        <section className="sf-section" aria-labelledby="cats-title">
          <div className="sf-wrap">
            <SectionHead
              eyebrow="Encuentra tu aroma"
              title={<span id="cats-title">Perfumes árabes para cada estilo</span>}
              text="Originales, intensos y de larga duración. Empieza por lo que te gusta."
            />
            <CategoryCards categories={categories} />
          </div>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="sf-section sf-section-tight">
          <div className="sf-wrap">
            <SectionHead eyebrow="Favoritos de nuestros clientes" title="Los más pedidos" align="split">
              <Link href="/#catalogo" className="sf-link-arrow">
                Ver todo <IconArrow size={16} />
              </Link>
            </SectionHead>
            <div className="sf-grid sf-grid-featured">
              {featured.map((perfume, i) => (
                <PerfumeCard key={perfume.id} perfume={perfume} preload={i < 2} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <BrandMarquee />

      <main className="sf-section sf-catalog" id="catalogo">
        <div className="sf-wrap">
          <SectionHead
            eyebrow="Nuestra colección"
            title="Perfumes originales en Pucallpa"
            text="Entrega gratis en Pucallpa y envíos a todo el Perú."
          />
          {perfumes.length === 0 ? (
            <p className="sf-empty">Muy pronto nuevos perfumes. ¡Vuelve pronto!</p>
          ) : (
            <PerfumeCatalog perfumes={perfumes} />
          )}
        </div>
      </main>

      <Statement />
      <WhyAlvian perfume={spotlight} />
      <Reels perfumes={reels} />
      <HowToBuy />
      <Testimonials reviews={reviews} />
      <GiftSection perfume={giftPick} />
      <FaqSection faqs={faqs} />

      <SiteFooter />
      <WhatsAppFloatingButton />
    </>
  );
}
