import { notFound } from 'next/navigation';
import { listPerfumes } from '@/lib/db';
import { brandSlug, perfumeBrand } from '@/lib/brands';
import { CATEGORY_PAGES, brandsInStore, metaDescription, sampleNames, storePerfumes } from '@/lib/seo';
import CollectionPage from '../../_store/CollectionPage';

// Se genera bajo demanda y se guarda en caché (máx. 60 s o hasta que el admin cambie algo).
export const revalidate = 60;

async function loadBrand(marca) {
  let all = [];
  try {
    all = await listPerfumes();
  } catch (error) {
    all = [];
  }
  const brands = brandsInStore(all);
  const brand = brands.find((b) => b.slug === marca);
  if (!brand) return null;
  const perfumes = storePerfumes(all)
    .filter((p) => brandSlug(perfumeBrand(p) || '') === marca)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'es'));
  return { brand, perfumes, brands };
}

export async function generateMetadata({ params }) {
  const { marca } = await params;
  const data = await loadBrand(marca);
  if (!data) return {};
  const { brand, perfumes } = data;
  const title = `Perfumes ${brand.name} Originales – Precios en Perú`;
  const description = metaDescription(
    `Perfumes ${brand.name} 100% originales en Pucallpa: ${sampleNames(perfumes)}. Precios en soles, pago con Yape o Plin y envíos a todo el Perú.`,
  );
  return {
    title,
    description,
    alternates: { canonical: `/marca/${marca}` },
    openGraph: {
      title: `${title} | Alvian Perfumes`,
      description,
      url: `/marca/${marca}`,
      type: 'website',
      ...(perfumes[0]?.image_url ? { images: [{ url: perfumes[0].image_url }] } : {}),
    },
  };
}

export default async function BrandPage({ params }) {
  const { marca } = await params;
  const data = await loadBrand(marca);
  if (!data) notFound();
  const { brand, perfumes, brands } = data;

  const related = [
    ...brands.filter((b) => b.slug !== marca).map((b) => ({ label: `Perfumes ${b.name}`, href: `/marca/${b.slug}` })),
    ...Object.entries(CATEGORY_PAGES).map(([key, page]) => ({ label: page.h1, href: `/perfumes/${key}` })),
  ];

  return (
    <CollectionPage
      eyebrow="Marca"
      title={`Perfumes ${brand.name} originales`}
      intro={`Fragancias ${brand.name} 100% originales, selladas y con gran duración. Compra en minutos, paga con Yape o Plin y recíbelas en Pucallpa o en cualquier parte del Perú.`}
      path={`/marca/${marca}`}
      perfumes={perfumes}
      crumbs={[{ name: `Perfumes ${brand.name}`, href: `/marca/${marca}` }]}
      related={related}
    />
  );
}
