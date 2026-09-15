import { buildWhatsAppLink, WHATSAPP_NUMBER } from '@/lib/whatsapp';
import SiteFooter from '../SiteFooter';
import SiteNav from '../SiteNav';
import WhatsAppFloatingButton from '../WhatsAppFloatingButton';
import WhatsAppIcon from '../WhatsAppIcon';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianperfumes.com';

export const metadata = {
  title: 'Contacto',
  description:
    'Contáctanos por WhatsApp para consultas sobre perfumes originales, pedidos y entregas en Pucallpa, con envíos a todo el Perú. Alvian Perfumes te responde rápido.',
  alternates: { canonical: '/contacto' },
  openGraph: {
    title: 'Contacto | Alvian Perfumes',
    description:
      'Escríbenos por WhatsApp para pedidos y consultas. Entrega en Pucallpa y envíos a todo el Perú.',
    url: '/contacto',
    type: 'website',
  },
};

const contactJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contacto - Alvian Perfumes',
  url: `${SITE_URL}/contacto`,
  mainEntity: {
    '@type': 'Organization',
    name: 'Alvian Perfumes',
    url: SITE_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: `+${WHATSAPP_NUMBER}`,
      areaServed: 'PE',
      availableLanguage: 'Spanish',
    },
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Contacto', item: `${SITE_URL}/contacto` },
  ],
};

export default function ContactoPage() {
  const whatsappHref = buildWhatsAppLink(
    'Hola, vengo desde su página web. ¿Me puede dar más información sobre sus perfumes, por favor?',
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <SiteNav />

      <nav aria-label="Ruta de navegación" className="breadcrumb">
        <a href="/">Inicio</a> <span>/</span> <span aria-current="page">Contacto</span>
      </nav>

      <section className="contact-section">
        <h1 className="section-title">Contacto</h1>
        <p className="about-text">
          ¿Tienes dudas sobre algún perfume o quieres hacer un pedido? Escríbenos por WhatsApp,
          te respondemos rápido y te ayudamos a elegir. Entregamos en Pucallpa y hacemos envíos a
          todo el Perú.
        </p>
        <a className="btn-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={19} height={19} />
          Escríbenos por WhatsApp
        </a>
      </section>

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
