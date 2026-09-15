import { listPerfumes } from '@/lib/db';
import { slugify } from '@/lib/slug';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianperfumes.com';

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
