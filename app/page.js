import { listPerfumes } from '@/lib/db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import BrandMarquee from './BrandMarquee';
import HeroCarousel from './HeroCarousel';
import PerfumeCatalog from './PerfumeCatalog';
import SiteNav from './SiteNav';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import WhatsAppIcon from './WhatsAppIcon';

export const dynamic = 'force-dynamic';

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

  const heroSlides = perfumes.filter((p) => p.image_url).slice(0, 5);
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
        description: perfume.description || `Perfume ${perfume.name} disponible en Alvian Perfumes, Pucallpa.`,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PEN',
          price: Number(perfume.price).toFixed(2),
          availability:
            perfume.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          areaServed: 'Pucallpa',
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
        {heroSlides.length > 0 ? (
          <HeroCarousel slides={heroSlides} whatsappHref={whatsappHref} />
        ) : (
          <div className="hero-fallback">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Alvian Perfumes - Perfumería en Pucallpa" className="hero-logo" />
            <p className="eyebrow">Perfumería en Pucallpa</p>
            <h1>Alvian</h1>
            <p className="hero-fallback-subtitle">
              Fragancias originales seleccionadas para ti en Pucallpa. Escríbenos por WhatsApp y
              te ayudamos a elegir tu perfume ideal, con entrega rápida en toda la ciudad.
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
        <h2 className="catalog-title">Perfumes originales en Pucallpa</h2>
        {perfumes.length === 0 ? (
          <p className="empty-state">Muy pronto nuevos perfumes. ¡Vuelve pronto!</p>
        ) : (
          <PerfumeCatalog perfumes={perfumes} />
        )}
      </main>

      <section className="about-section" id="nosotros">
        <h2 className="section-title">Quiénes somos</h2>
        <p className="about-text">
          En Alvian Perfumes creemos que un buen perfume dice mucho de ti. Somos una perfumería en
          Pucallpa dedicada a ofrecer fragancias 100% originales, cuidadosamente seleccionadas
          para dama y caballero. Te atendemos de forma personalizada por WhatsApp para ayudarte a
          encontrar el perfume ideal, con entregas rápidas en toda la ciudad.
        </p>
      </section>

      <section className="contact-section" id="contacto">
        <h2 className="section-title">Contacto</h2>
        <p className="about-text">
          ¿Tienes dudas sobre algún perfume o quieres hacer un pedido? Escríbenos por WhatsApp,
          te respondemos rápido y te ayudamos a elegir.
        </p>
        <a className="btn-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={19} height={19} />
          Escríbenos por WhatsApp
        </a>
      </section>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Alvian Perfumes · Perfumería en Pucallpa, Perú</p>
      </footer>

      <WhatsAppFloatingButton />
    </>
  );
}
