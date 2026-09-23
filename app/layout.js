import { Playfair_Display, Inter, Poppins } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import AnalyticsWithFilter from './AnalyticsWithFilter';
import { CartProvider } from './_store/CartProvider';
import CartDrawer from './_store/CartDrawer';
import { getStoreConfig } from '@/lib/store-db';
import './globals.css';
import './store.css';
import './storefront.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// Inter: solo lo usa el panel de administración (tablas, formularios).
const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
});

// Poppins: tipografía principal de la tienda (títulos gruesos + texto).
const sans = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
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
  themeColor: '#0e2b21',
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

export default async function RootLayout({ children }) {
  const config = await getStoreConfig();
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${sans.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        <CartProvider>
          {children}
          <CartDrawer freeFrom={Number(config.shipping.freeFrom) || 0} />
        </CartProvider>
        <AnalyticsWithFilter />
        <SpeedInsights />
      </body>
    </html>
  );
}
