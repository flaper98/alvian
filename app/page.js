import { listPerfumes, listHeroBanners } from '@/lib/db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { slugify } from '@/lib/slug';
import BrandMarquee from './BrandMarquee';
import HeroCarousel from './HeroCarousel';
import PerfumeCatalog from './PerfumeCatalog';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import WhatsAppIcon from './WhatsAppIcon';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';
const CATEGORY_LABELS = { hombre: 'Perfumes para hombre', mujer: 'Perfumes para mujer', unisex: 'Perfumes unisex' };

export default async function HomePage() {
  let perfumes = [];
  try {
    const allPerfumes = await listPerfumes();
    // Un producto recién creado empieza sin precio (se define al registrar la
    // primera compra), así que no se muestra en la tienda hasta tener precio.
    perfumes = allPerfumes
      .filter((perfume) => Number(perfume.price) > 0)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  } catch (error) {
    perfumes = [];
  }

  let heroBanners = [];
  try {
    heroBanners = await listHeroBanners({ onlyActive: true });
  } catch (error) {
    heroBanners = [];
  }

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
        description: perfume.description || `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa, con envíos a todo el Perú.`,
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

      <SiteNav />

      <header id="inicio">
        {heroBanners.length > 0 ? (
          <HeroCarousel slides={heroBanners} />
        ) : (
          <div className="hero-fallback">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Alvian Perfumes - Perfumería en Pucallpa" className="hero-logo" />
            <p className="eyebrow">Perfumería en Pucallpa</p>
            <h1>Alvian</h1>
            <p className="hero-fallback-subtitle">
              Fragancias originales seleccionadas para ti. Escríbenos por WhatsApp y te ayudamos a
              elegir tu perfume ideal, con entrega rápida en Pucallpa y envíos a todo el Perú.
            </p>
            <div className="hero-actions">
              <a className="btn-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon width={19} height={19} />
                Escríbenos por WhatsApp
              </a>
              <a href="#catalogo" className="btn-hero-outline">
                Ver catálogo
              </a>
            </div>
          </div>
        )}
      </header>

      <BrandMarquee />

      <main className="catalog" id="catalogo">
        <div className="catalog-header">
          <p className="eyebrow">Nuestra colección</p>
          <h2 className="catalog-title">Perfumes originales en Pucallpa</h2>
          <p className="catalog-subtitle">Entrega en Pucallpa y envíos a todo el Perú</p>
        </div>
        {perfumes.length === 0 ? (
          <p className="empty-state">Muy pronto nuevos perfumes. ¡Vuelve pronto!</p>
        ) : (
          <PerfumeCatalog perfumes={perfumes} />
        )}
      </main>

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
