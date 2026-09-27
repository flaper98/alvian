'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

// Pixel base de Meta (Facebook/Instagram Ads): avisa "PageView" en cada
// página pública. El ID se edita en Admin → Tienda online → Ajustes →
// Marketing, sin tocar código. Si está vacío, o si es una página de admin, no
// se carga nada (igual que Vercel Analytics: el tráfico del panel no cuenta).
export default function MetaPixel({ pixelId }) {
  const pathname = usePathname();
  if (!pixelId || pathname?.startsWith('/admin')) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
