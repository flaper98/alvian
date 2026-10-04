import Link from 'next/link';
import { SITE_URL, jsonLdHtml } from '@/lib/seo';
import { slugify } from '@/lib/slug';
import PerfumeCard from '../PerfumeCard';
import SiteFooter from '../SiteFooter';
import WhatsAppFloatingButton from '../WhatsAppFloatingButton';
import SiteHeader from './SiteHeader';
import { HowToBuy } from './sections';

/**
 * Página de colección (categoría o marca): título, texto, perfumes y enlaces a
 * otras colecciones. Incluye los datos estructurados para Google (lista de
 * productos + migas de pan).
 */
export default function CollectionPage({ eyebrow, title, intro, path, perfumes, crumbs, related }) {
  const url = `${SITE_URL}${path}`;
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: perfumes.map((perfume, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/perfume/${slugify(perfume.name)}`,
        name: perfume.name,
      })),
    },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Inicio', href: '/' }, ...crumbs].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }} />

      <SiteHeader />

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <Link href="/">Inicio</Link>
        {crumbs.map((crumb, index) => (
          <span key={crumb.href}>
            {' '}
            <span>/</span>{' '}
            {index === crumbs.length - 1 ? (
              <span aria-current="page">{crumb.name}</span>
            ) : (
              <Link href={crumb.href}>{crumb.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <main className="sf-section sf-collection">
        <div className="sf-wrap">
          <header className="sf-collection-head">
            <p className="sf-eyebrow">{eyebrow}</p>
            <h1 className="sf-h2 sf-h2-xl">{title}</h1>
            <p className="sf-lead">{intro}</p>
            <p className="sf-collection-count">
              {perfumes.length} {perfumes.length === 1 ? 'fragancia' : 'fragancias'}
            </p>
          </header>

          {perfumes.length === 0 ? (
            <p className="sf-empty">Muy pronto nuevas fragancias aquí. ¡Vuelve pronto!</p>
          ) : (
            <div className="sf-grid">
              {perfumes.map((perfume, i) => (
                <PerfumeCard key={perfume.id} perfume={perfume} preload={i < 4} />
              ))}
            </div>
          )}

          {related.length > 0 ? (
            <nav className="sf-collection-links" aria-label="Otras colecciones">
              <h2 className="sf-collection-links-title">Explora más</h2>
              <ul>
                {related.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </main>

      <HowToBuy compact />
      <SiteFooter />
      <WhatsAppFloatingButton />
    </>
  );
}
