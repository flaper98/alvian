import { listPerfumes } from '@/lib/db';
import { slugify } from '@/lib/slug';

// Se regenera cada hora para incluir perfumes nuevos.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';

export default async function sitemap() {
  const staticRoutes = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/nosotros`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contacto`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...['seguimiento', 'reclamaciones', 'terminos', 'privacidad'].map((path) => ({
      url: `${SITE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    })),
  ];

  let perfumeRoutes = [];
  try {
    const perfumes = await listPerfumes();
    perfumeRoutes = perfumes
      .filter((p) => Number(p.price) > 0)
      .map((p) => ({
        url: `${SITE_URL}/perfume/${slugify(p.name)}`,
        lastModified: p.created_at ? new Date(p.created_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
  } catch (error) {
    perfumeRoutes = [];
  }

  return [...staticRoutes, ...perfumeRoutes];
}
