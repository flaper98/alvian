import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { CATEGORY_PAGES, brandsInStore, metaDescription, sampleNames, storePerfumes } from '@/lib/seo';
import CollectionPage from '../../_store/CollectionPage';

// Se genera bajo demanda y se guarda en caché (máx. 60 s o hasta que el admin cambie algo).
export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CATEGORY_PAGES).map((categoria) => ({ categoria }));
}

async function loadCategory(categoria) {
  const page = CATEGORY_PAGES[categoria];
  if (!page) return null;
  let all = [];
  try {
    all = await listPerfumes();
  } catch (error) {
    all = [];
  }
  const perfumes = storePerfumes(all)
    .filter((p) => p.category === categoria)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'es'));
  return { page, perfumes, brands: brandsInStore(all) };
}

export async function generateMetadata({ params }) {
  const { categoria } = await params;
  const data = await loadCategory(categoria);
  if (!data) return {};
  const { page, perfumes } = data;
  const description = metaDescription(
    `${page.h1} 100% originales${perfumes.length ? `: ${sampleNames(perfumes)}` : ''}. Precios en soles, pago con Yape o Plin y envíos a todo el Perú desde Pucallpa.`,
  );
  return {
    title: page.title,
    description,
    alternates: { canonical: `/perfumes/${categoria}` },
    openGraph: {
      title: `${page.title} | Alvian Perfumes`,
      description,
      url: `/perfumes/${categoria}`,
      type: 'website',
      ...(perfumes[0]?.image_url ? { images: [{ url: perfumes[0].image_url }] } : {}),
    },
  };
}

export default async function CategoryPage({ params }) {
  const { categoria } = await params;
  const data = await loadCategory(categoria);
  if (!data) notFound();
  const { page, perfumes, brands } = data;

  const related = [
    ...Object.entries(CATEGORY_PAGES)
      .filter(([key]) => key !== categoria)
      .map(([key, other]) => ({ label: other.h1, href: `/perfumes/${key}` })),
    ...brands.map((b) => ({ label: `Perfumes ${b.name}`, href: `/marca/${b.slug}` })),
  ];

  return (
    <CollectionPage
      eyebrow={page.label}
      title={page.h1}
      intro={page.intro}
      path={`/perfumes/${categoria}`}
      perfumes={perfumes}
      crumbs={[{ name: page.h1, href: `/perfumes/${categoria}` }]}
      related={related}
    />
  );
}
