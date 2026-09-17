'use client';

import { Analytics } from '@vercel/analytics/next';

// El panel de administración no debe contarse como tráfico del sitio: filtramos
// cualquier evento cuya URL empiece con /admin antes de que se envíe a Vercel.
function beforeSend(event) {
  if (event.url.startsWith('/admin')) return null;
  return event;
}

export default function AnalyticsWithFilter() {
  return <Analytics beforeSend={beforeSend} />;
}
