'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

// Contenedor de Google Tag Manager. Se puede cambiar con la variable de
// entorno NEXT_PUBLIC_GTM_ID sin tocar código.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TN3NSNF2';

// Igual que el Meta Pixel y Vercel Analytics: el panel de administración no se
// mide, para que tus propias visitas no cuenten como tráfico.
export default function GoogleTagManager() {
  const pathname = usePathname();
  if (!GTM_ID || pathname?.startsWith('/admin')) return null;

  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>
    </>
  );
}
