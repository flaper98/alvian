'use client';

import { Analytics } from '@vercel/analytics/next';

// El panel de administración no debe contarse como tráfico del sitio: filtramos
// cualquier evento cuya URL empiece con /admin antes de que se envíe a Vercel.
// Ojo: event.url es la URL completa (https://dominio/admin/...), no solo la ruta.
function beforeSend(event) {
  let pathname = event.url;
  try {
    pathname = new URL(event.url, 'https://alvian.local').pathname;
  } catch (error) {
    // URL rara: se evalúa tal cual.
  }
  if (pathname.startsWith('/admin')) return null;
  return event;
}

export default function AnalyticsWithFilter() {
  return <Analytics beforeSend={beforeSend} />;
}
