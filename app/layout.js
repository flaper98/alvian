import { Playfair_Display, Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import AnalyticsWithFilter from './AnalyticsWithFilter';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Alvian Perfumes | Perfumería original en Pucallpa',
    template: '%s | Alvian Perfumes',
  },
  description:
    'Perfumería Alvian en Pucallpa: fragancias originales para dama y caballero. Elige tu perfume y compra fácil por WhatsApp, con entrega en Pucallpa y envíos a todo el Perú.',
  keywords: [
    'perfumes Pucallpa',
    'perfumería Pucallpa',
    'perfumes originales Pucallpa',
    'fragancias Pucallpa',
    'comprar perfumes Pucallpa',
    'envíos de perfumes a todo el Perú',
    'Alvian Perfumes',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/',
    siteName: 'Alvian Perfumes',
    title: 'Alvian Perfumes | Perfumería original en Pucallpa',
    description:
      'Fragancias originales para dama y caballero. Compra por WhatsApp, con entrega en Pucallpa y envíos a todo el Perú.',
    images: [{ url: '/logo.jpg', width: 512, height: 512, alt: 'Alvian Perfumes' }],
  },
  twitter: {
    card: 'summary',
    title: 'Alvian Perfumes | Perfumería original en Pucallpa',
    description:
      'Fragancias originales para dama y caballero. Entrega en Pucallpa y envíos a todo el Perú.',
    images: ['/logo.jpg'],
  },
  icons: {
    icon: '/logo.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const businessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Alvian Perfumes',
  url: SITE_URL,
  image: `${SITE_URL}/logo.jpg`,
  telephone: `+${WHATSAPP_NUMBER}`,
  priceRange: 'S/',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Pucallpa',
    addressRegion: 'Ucayali',
    addressCountry: 'PE',
  },
  areaServed: [
    {
      '@type': 'City',
      name: 'Pucallpa',
    },
    {
      '@type': 'Country',
      name: 'Perú',
    },
  ],
  sameAs: [
    'https://www.instagram.com/alvian_fragancias/',
    'https://www.tiktok.com/@alvian_fragancias',
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        {children}
        <AnalyticsWithFilter />
        <SpeedInsights />
      </body>
    </html>
  );
}
