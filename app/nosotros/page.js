import SiteFooter from '../SiteFooter';
import SiteNav from '../SiteNav';
import WhatsAppFloatingButton from '../WhatsAppFloatingButton';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';

export const metadata = {
  title: 'Quiénes somos',
  description:
    'Conoce Alvian Perfumes: perfumería en Pucallpa dedicada a fragancias 100% originales, con atención personalizada por WhatsApp, entrega en Pucallpa y envíos a todo el Perú.',
  alternates: { canonical: '/nosotros' },
  openGraph: {
    title: 'Quiénes somos | Alvian Perfumes',
    description:
      'Perfumería en Pucallpa dedicada a fragancias 100% originales, con entrega en Pucallpa y envíos a todo el Perú.',
    url: '/nosotros',
    type: 'website',
  },
};

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Quiénes somos - Alvian Perfumes',
  url: `${SITE_URL}/nosotros`,
  description: metadata.description,
  mainEntity: {
    '@type': 'Organization',
    name: 'Alvian Perfumes',
    url: SITE_URL,
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Quiénes somos', item: `${SITE_URL}/nosotros` },
  ],
};

export default function NosotrosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <SiteNav />

      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <a href="/">Inicio</a> <span>/</span> <span aria-current="page">Quiénes somos</span>
      </nav>

      <section className="about-section">
        <h1 className="section-title">Quiénes somos</h1>
        <p className="about-text">
          En Alvian Perfumes creemos que un buen perfume dice mucho de ti. Somos una perfumería en
          Pucallpa dedicada a ofrecer fragancias 100% originales, cuidadosamente seleccionadas
          para dama y caballero. Te atendemos de forma personalizada por WhatsApp para ayudarte a
          encontrar el perfume ideal, con entrega rápida en Pucallpa y envíos a todo el Perú.
        </p>
        <ul className="about-features">
          <li>Perfumes 100% originales</li>
          <li>Atención personalizada por WhatsApp</li>
          <li>Entrega rápida en Pucallpa</li>
          <li>Envíos a todo el Perú</li>
        </ul>
      </section>

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
