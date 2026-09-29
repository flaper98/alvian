import { slugify } from '@/lib/slug';

// La tienda vende todo como disponible, aunque el stock real sea 0: si falta,
// se compra al proveedor después del pedido. El stock real solo se usa en el
// panel. Este valor es solo el tope de unidades por perfume en el carrito.
export const STORE_MAX_QTY = 10;

/** Datos mínimos de un perfume para el carrito (se guardan en el navegador). */
export function toCartProduct(perfume) {
  return {
    id: perfume.id,
    name: perfume.name,
    price: Number(perfume.price),
    image: perfume.image_url,
    slug: slugify(perfume.name),
    stock: STORE_MAX_QTY,
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
