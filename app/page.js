import { listPerfumes } from '@/lib/db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import PerfumeCatalog from './PerfumeCatalog';
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

      <header className="hero">
        <div className="hero-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Alvian Perfumes - Perfumería en Pucallpa" className="hero-logo" />
          <p className="eyebrow">Perfumería en Pucallpa</p>
          <h1>Alvian</h1>
          <p className="hero-subtitle">
            Fragancias originales seleccionadas para ti en Pucallpa. Escríbenos por WhatsApp y te
            ayudamos a elegir tu perfume ideal, con entrega rápida en toda la ciudad.
          </p>
          <a
            className="btn-whatsapp"
            href={buildWhatsAppLink('Hola, quiero información sobre sus perfumes.')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon width={19} height={19} />
            Escríbenos por WhatsApp
          </a>
        </div>
      </header>

      <main className="catalog">
        <h2 className="catalog-title">Perfumes originales en Pucallpa</h2>
        {perfumes.length === 0 ? (
          <p className="empty-state">Muy pronto nuevos perfumes. ¡Vuelve pronto!</p>
        ) : (
          <PerfumeCatalog perfumes={perfumes} />
        )}
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Alvian Perfumes · Perfumería en Pucallpa, Perú</p>
      </footer>

      <WhatsAppFloatingButton />
    </>
  );
}
