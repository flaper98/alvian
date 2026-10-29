import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { GUIDES, findGuide, sectionPerfumes } from '@/lib/guides';
import { SITE_URL, jsonLdHtml, storePerfumes } from '@/lib/seo';
import { slugify } from '@/lib/slug';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import PerfumeCard from '../../PerfumeCard';
import SiteFooter from '../../SiteFooter';
import WhatsAppFloatingButton from '../../WhatsAppFloatingButton';
import SiteHeader from '../../_store/SiteHeader';
import { HowToBuy } from '../../_store/sections';
import RichText, { plainText } from '../RichText';

// Los perfumes (precio y stock) se actualizan cada hora.
export const revalidate = 3600;

const dateFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatDate = (iso) => dateFmt.format(new Date(`${iso}T00:00:00Z`));

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

async function loadPerfumes() {
  try {
    return storePerfumes(await listPerfumes());
  } catch (error) {
    // Sin base al compilar se genera sin perfumes; en producción el error se
    // propaga para no guardar en caché una guía sin productos.
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error;
    return [];
  }
}

const slugOf = (perfume) => slugify(perfume.name);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  const perfumes = await loadPerfumes().catch(() => []);
  const cover = guide.sections.flatMap((s) => sectionPerfumes(s, perfumes, slugOf))[0];
  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: `/guias/${slug}` },
    openGraph: {
      title: `${guide.title} | Alvian Perfumes`,
      description: guide.description,
      url: `/guias/${slug}`,
      type: 'article',
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      ...(cover?.image_url ? { images: [{ url: cover.image_url }] } : {}),
    },
  };
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  const perfumes = await loadPerfumes();
  const sections = guide.sections.map((section) => ({ ...section, items: sectionPerfumes(section, perfumes, slugOf) }));
  const cover = sections.flatMap((s) => s.items)[0];
  const others = GUIDES.filter((g) => g.slug !== slug);
  const whatsappHref = buildWhatsAppLink(
    `Hola, leí la guía "${guide.title}" en su web. ¿Me ayudan a elegir un perfume?`,
  );

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.published,
    dateModified: guide.updated,
    inLanguage: 'es-PE',
    mainEntityOfPage: `${SITE_URL}/guias/${slug}`,
    ...(cover?.image_url ? { image: [cover.image_url] } : {}),
    author: { '@type': 'Organization', name: 'Alvian Perfumes', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Alvian Perfumes', url: SITE_URL },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guías', item: `${SITE_URL}/guias` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE_URL}/guias/${slug}` },
    ],
  };
  const faqJsonLd = guide.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: plainText(item.a) },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }} />
      {faqJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(faqJsonLd) }} />
      ) : null}

      <SiteHeader />

      <nav aria-label="Ruta de navegación" className="breadcrumb breadcrumb-wide">
        <Link href="/">Inicio</Link> <span>/</span> <Link href="/guias">Guías</Link> <span>/</span>{' '}
        <span aria-current="page">{guide.title}</span>
      </nav>

      <main className="sf-section sf-collection guide">
        <article className="sf-wrap">
          <header className="guide-head">
            <p className="sf-eyebrow">Guía</p>
            <h1 className="sf-h2 sf-h2-xl">{guide.title}</h1>
            <p className="guide-meta">
              Actualizado el {formatDate(guide.updated)} · {guide.minutes} min de lectura
            </p>
            <p className="sf-lead guide-intro">
              <RichText text={guide.intro} />
            </p>
          </header>

          {sections.map((section) => (
            <section key={section.heading} className="guide-section">
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((text, i) => (
                <p key={i} className="guide-text">
                  <RichText text={text} />
                </p>
              ))}
              {section.items.length ? (
                <div className="sf-grid guide-grid">
                  {section.items.map((perfume) => (
                    <PerfumeCard key={perfume.id} perfume={perfume} />
                  ))}
                </div>
              ) : null}
            </section>
          ))}

          {guide.tips ? (
            <section className="guide-section guide-tips">
              <h2>{guide.tips.heading}</h2>
              <ul>
                {guide.tips.items.map((item, i) => (
                  <li key={i}>
                    <RichText text={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {guide.faq?.length ? (
            <section className="guide-section guide-faq">
              <h2>Preguntas frecuentes</h2>
              {guide.faq.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>
                    <RichText text={item.a} />
                  </p>
                </details>
              ))}
            </section>
          ) : null}

          <aside className="guide-cta">
            <div>
              <strong>¿No sabes cuál elegir?</strong>
              <p>Cuéntanos qué perfumes te gustan y te recomendamos el ideal para ti.</p>
            </div>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-dark">
              Asesoría por WhatsApp
            </a>
          </aside>

          <nav className="sf-collection-links" aria-label="Otras guías">
            <h2 className="sf-collection-links-title">Más guías</h2>
            <ul>
              {others.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guias/${g.slug}`}>{g.title}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>

      <HowToBuy compact />
      <SiteFooter />
      <WhatsAppFloatingButton />
    </>
  );
}
