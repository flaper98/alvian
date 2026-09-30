import { slugify } from './slug';

// Marcas que se reconocen solas en el nombre o la descripción del perfume.
export const KNOWN_BRANDS = [
  'Lattafa',
  'Armaf',
  'Rasasi',
  'Afnan',
  'Al Haramain',
  'Maison Alhambra',
  'French Avenue',
  'Fragrance World',
  'Zakat',
  'Amaran',
  'Vurv',
];

// Líneas conocidas cuya marca no suele venir escrita en el nombre.
const LINE_BRANDS = [
  [/^hawas\b/i, 'Rasasi'],
  [/^(yara|khamrah|asad|eclaire|qaed al fursan|fakhar|badee al oud|amethyst|maahir|honor ?& ?glory|noble blush|ajwad|ana abiyedh)\b/i, 'Lattafa'],
  [/^(club de nuit|odyssey|mandarin sky)\b/i, 'Armaf'],
  [/^(9 ?pm|9 ?am|supremacy|turathi)\b/i, 'Afnan'],
];

const mentionedBrand = (text) =>
  KNOWN_BRANDS.find((brand) => new RegExp(`\\b${brand}\\b`, 'i').test(String(text || '')));

/**
 * Marca de un perfume, en este orden: la escrita en el panel; una marca que
 * aparezca en el nombre; la de su línea (Hawas → Rasasi, Yara → Lattafa…); y
 * por último una marca mencionada en la descripción. null si no se sabe.
 */
export function perfumeBrand(perfume) {
  const manual = String(perfume?.brand || '').trim();
  if (manual) return manual;
  const name = String(perfume?.name || '').trim();
  return (
    mentionedBrand(name) ||
    LINE_BRANDS.find(([pattern]) => pattern.test(name))?.[1] ||
    mentionedBrand(perfume?.description) ||
    null
  );
}

export function brandSlug(brand) {
  return slugify(brand);
}
