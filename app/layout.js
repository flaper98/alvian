import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

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
  title: 'Alvian Perfumes',
  description: 'Perfumería Alvian — fragancias originales. Escríbenos y compra por WhatsApp.',
  icons: {
    icon: '/logo.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
