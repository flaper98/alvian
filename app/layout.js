import { Playfair_Display, Inter, Poppins } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import AnalyticsWithFilter from './AnalyticsWithFilter';
import { CartProvider } from './_store/CartProvider';
import CartDrawer from './_store/CartDrawer';
import MetaPixel from './_store/MetaPixel';
import GoogleTagManager from './_store/GoogleTagManager';
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
  // "Perfumes árabes" es el nicho de la tienda: va primero en el título.
  title: {
    default: 'Perfumes Árabes Originales en Pucallpa | Lattafa, Armaf, Rasasi – Alvian',
    template: '%s | Alvian Perfumes',
  },
  description:
    'Perfumes árabes 100% originales en Pucallpa: Lattafa, Armaf, Rasasi y Afnan. Precios en soles, pago con Yape o Plin y envíos a todo el Perú.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: '/',
    siteName: 'Alvian Perfumes',
    title: 'Perfumes Árabes Originales en Pucallpa | Alvian Perfumes',
    description:
      'Lattafa, Armaf, Rasasi y Afnan 100% originales. Paga con Yape o Plin y recíbelo en Pucallpa o en todo el Perú.',
    images: [{ url: '/og', width: 1200, height: 630, alt: 'Alvian Perfumes · Perfumes árabes originales' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfumes Árabes Originales en Pucallpa | Alvian Perfumes',
    description: 'Lattafa, Armaf, Rasasi y Afnan 100% originales. Envíos a todo el Perú.',
    images: ['/og'],
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
        {/* Google Tag Manager: justo después de abrir <body>, como indica Google. */}
        <GoogleTagManager />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }}
        />
        <CartProvider>
          {children}
          <CartDrawer freeFrom={Number(config.shipping.freeFrom) || 0} />
        </CartProvider>
        <MetaPixel pixelId={config.marketing.metaPixelId} />
        <AnalyticsWithFilter />
        <SpeedInsights />
      </body>
    </html>
  );
}
