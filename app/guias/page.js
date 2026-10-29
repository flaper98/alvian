import Link from 'next/link';
import { GUIDES } from '@/lib/guides';
import { SITE_URL, jsonLdHtml } from '@/lib/seo';
import SiteFooter from '../SiteFooter';
import WhatsAppFloatingButton from '../WhatsAppFloatingButton';
import SiteHeader from '../_store/SiteHeader';

export const revalidate = 3600;

const DESCRIPTION =
  'Guías para elegir tu perfume árabe: los mejores para hombre y mujer, perfumes para el calor, parecidos a perfumes de diseñador, cómo saber si es original y más.';

export const metadata = {
  title: 'Guías de Perfumes Árabes',
  description: DESCRIPTION,
  alternates: { canonical: '/guias' },
  openGraph: {
    title: 'Guías de Perfumes Árabes | Alvian Perfumes',
    description: DESCRIPTION,
    url: '/guias',
    type: 'website',
  },
};

export default function GuidesPage() {
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Guías de perfumes árabes',
    url: `${SITE_URL}/guias`,
    description: DESCRIPTION,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: GUIDES.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/guias/${guide.slug}`,
        name: guide.title,
      })),
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guías', item: `${SITE_URL}/guias` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(listJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }} />

      <SiteHeader />

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <Link href="/">Inicio</Link> <span>/</span> <span aria-current="page">Guías</span>
      </nav>

      <main className="sf-section sf-collection">
        <div className="sf-wrap">
          <header className="sf-collection-head">
            <p className="sf-eyebrow">Guías</p>
            <h1 className="sf-h2 sf-h2-xl">Guías de perfumes árabes</h1>
            <p className="sf-lead">
              Todo lo que necesitas para elegir tu próximo perfume: recomendaciones por estilo y ocasión, consejos
              para el calor de la selva y cómo reconocer un perfume original.
            </p>
          </header>

          <ul className="guide-list">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/guias/${guide.slug}`} className="guide-card">
                  <h2>{guide.title}</h2>
                  <p>{guide.description}</p>
                  <span className="guide-card-more">
                    Leer guía · {guide.minutes} min <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <SiteFooter />
      <WhatsAppFloatingButton />
    </>
  );
}
