import { listPerfumes } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { CATEGORY_PAGES, brandsInStore, isInStore } from '@/lib/seo';
import { GUIDES } from '@/lib/guides';

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

  // Páginas de categoría y de marca: son las que responden búsquedas como
  // "perfumes árabes para hombre" o "perfumes Lattafa Perú".
  const collectionRoutes = Object.keys(CATEGORY_PAGES).map((key) => ({
    url: `${SITE_URL}/perfumes/${key}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  // Guías: responden búsquedas como "mejores perfumes árabes para hombre".
  const guideRoutes = [
    { url: `${SITE_URL}/guias`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...GUIDES.map((guide) => ({
      url: `${SITE_URL}/guias/${guide.slug}`,
      lastModified: new Date(`${guide.updated}T00:00:00Z`),
      changeFrequency: 'monthly',
      priority: 0.7,
    })),
  ];

  let perfumeRoutes = [];
  try {
    const perfumes = await listPerfumes();
    perfumeRoutes = [
      ...brandsInStore(perfumes).map((brand) => ({
        url: `${SITE_URL}/marca/${brand.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      })),
      ...perfumes
        .filter(isInStore)
        .map((p) => ({
          url: `${SITE_URL}/perfume/${slugify(p.name)}`,
          lastModified: p.created_at ? new Date(p.created_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })),
    ];
  } catch (error) {
    perfumeRoutes = [];
  }

  return [...staticRoutes, ...collectionRoutes, ...guideRoutes, ...perfumeRoutes];
}
