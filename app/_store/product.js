import { slugify } from '@/lib/slug';

/** Datos mínimos de un perfume para el carrito (se guardan en el navegador). */
export function toCartProduct(perfume) {
  return {
    id: perfume.id,
    name: perfume.name,
    price: Number(perfume.price),
    image: perfume.image_url,
    slug: slugify(perfume.name),
    stock: Number(perfume.stock) || 0,
  };
}

export function discountPercent(perfume) {
  const price = Number(perfume.price);
  const compare = Number(perfume.compare_price);
  if (!compare || compare <= price) return 0;
  return Math.round((1 - price / compare) * 100);
}

const CATEGORY_LABELS = { hombre: 'Para él', mujer: 'Para ella', unisex: 'Unisex' };

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || '';
}
