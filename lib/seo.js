import { brandSlug, perfumeBrand } from './brands';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://alvianfragancias.com';

/** Recorta un texto a ~155 caracteres (lo que Google muestra) sin cortar palabras. */
export function metaDescription(text, max = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/[\s,.;:–-]+\S*$/, '')}…`;
}

// Páginas de categoría: /perfumes/hombre, /perfumes/mujer, /perfumes/unisex.
export const CATEGORY_PAGES = {
  hombre: {
    label: 'Para él',
    h1: 'Perfumes árabes para hombre',
    title: 'Perfumes Árabes para Hombre Originales – Precios en Perú',
    intro:
      'Fragancias árabes originales para hombre: amaderadas, especiadas y frescas, con gran duración en la piel. Elige la tuya, paga con Yape o Plin y recíbela en Pucallpa o en cualquier parte del Perú.',
  },
  mujer: {
    label: 'Para ella',
    h1: 'Perfumes árabes para mujer',
    title: 'Perfumes Árabes para Mujer Originales – Precios en Perú',
    intro:
      'Fragancias árabes originales para mujer: dulces, frutales, florales y gourmand que dejan huella. Elige la tuya, paga con Yape o Plin y recíbela en Pucallpa o en cualquier parte del Perú.',
  },
  unisex: {
    label: 'Unisex',
    h1: 'Perfumes árabes unisex',
    title: 'Perfumes Árabes Unisex Originales – Precios en Perú',
    intro:
      'Fragancias árabes originales para compartir: orientales, cálidas y de larga duración. Elige la tuya, paga con Yape o Plin y recíbela en Pucallpa o en cualquier parte del Perú.',
  },
};

/** Perfumes que se muestran en la tienda (los que ya tienen precio). */
export function storePerfumes(perfumes) {
  return perfumes.filter((p) => Number(p.price) > 0);
}

/** Marcas con al menos un perfume en la tienda, de la que más tiene a la que menos. */
export function brandsInStore(perfumes) {
  const counts = new Map();
  for (const perfume of storePerfumes(perfumes)) {
    const brand = perfumeBrand(perfume);
    if (!brand) continue;
    const slug = brandSlug(brand);
    const current = counts.get(slug) || { name: brand, slug, count: 0 };
    current.count += 1;
    counts.set(slug, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** "Hawas Ice, Yara, Khamrah y más" para descripciones. */
export function sampleNames(perfumes, limit = 4) {
  const names = perfumes.slice(0, limit).map((p) => p.name);
  if (names.length === 0) return '';
  return perfumes.length > limit ? `${names.join(', ')} y más` : names.join(', ');
}
