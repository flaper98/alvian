// Google Tag Manager, instalado tal como lo pide Google: el script dentro de
// <head> (en el HTML que envía el servidor, para que el probador de Google lo
// detecte) y el <noscript> justo después de abrir <body>.
// Se puede cambiar el contenedor con la variable NEXT_PUBLIC_GTM_ID.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-TN3NSNF2';

// Igual que el Meta Pixel y Vercel Analytics: el panel de administración no se
// mide, para que tus propias visitas no cuenten como tráfico.
const HEAD_SNIPPET = `if(!location.pathname.startsWith('/admin')){(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');}`;

/** Va dentro de <head>, lo más arriba posible. */
export function GoogleTagManagerHead() {
  if (!GTM_ID) return null;
  return <script id="google-tag-manager" dangerouslySetInnerHTML={{ __html: HEAD_SNIPPET }} />;
}

/** Va justo después de abrir <body>. Solo actúa si el navegador no tiene JavaScript. */
export function GoogleTagManagerNoscript() {
  if (!GTM_ID) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
