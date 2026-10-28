import { listPerfumes } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { perfumeBrand } from '@/lib/brands';
import { SITE_URL, isInStore } from '@/lib/seo';

// Feed de productos para Google Merchant Center (fichas gratuitas de Shopping).
// Google lo descarga una vez al día desde https://alvianfragancias.com/feed/google.xml.
// Se regenera cada hora, igual que el sitemap.
export const revalidate = 3600;

const GENDERS = { hombre: 'male', mujer: 'female', unisex: 'unisex' };
const BACKORDER_DAYS = 7;

const escapeXml = (value) =>
  String(value ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const absolute = (url) => (/^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);
const price = (value) => `${Number(value).toFixed(2)} PEN`;

function item(perfume) {
  const brand = perfumeBrand(perfume);
  const inStock = Number(perfume.stock) > 0;
  const compare = Number(perfume.compare_price) || 0;
  const onSale = compare > Number(perfume.price);
  const description =
    String(perfume.description || '').trim() ||
    `Perfume ${perfume.name}${brand ? ` de ${brand}` : ''}, original y sellado. Envíos a todo el Perú desde Pucallpa.`;
  const fields = [
    ['g:id', perfume.id],
    ['g:title', brand && !perfume.name.toLowerCase().includes(brand.toLowerCase()) ? `${perfume.name} ${brand}` : perfume.name],
    ['g:description', description.slice(0, 4900)],
    ['g:link', `${SITE_URL}/perfume/${slugify(perfume.name)}`],
    ['g:image_link', absolute(perfume.image_url)],
    // Sin stock se vende por encargo: Google lo pide como "backorder" con fecha estimada.
    ['g:availability', inStock ? 'in_stock' : 'backorder'],
    ...(inStock
      ? []
      : [['g:availability_date', new Date(Date.now() + BACKORDER_DAYS * 86400000).toISOString().slice(0, 10)]]),
    ['g:price', price(onSale ? compare : perfume.price)],
    ...(onSale ? [['g:sale_price', price(perfume.price)]] : []),
    ['g:condition', 'new'],
    ['g:brand', brand || 'Alvian Perfumes'],
    // Los perfumes árabes casi nunca traen código de barras (GTIN) registrado.
    ['g:identifier_exists', 'no'],
    ['g:google_product_category', '479'],
    ['g:product_type', 'Perfumes árabes'],
    ...(GENDERS[perfume.category] ? [['g:gender', GENDERS[perfume.category]]] : []),
    ['g:age_group', 'adult'],
  ];
  return `    <item>\n${fields.map(([tag, value]) => `      <${tag}>${escapeXml(value)}</${tag}>`).join('\n')}\n    </item>`;
}

export async function GET() {
  let perfumes = [];
  try {
    perfumes = (await listPerfumes()).filter(isInStore);
  } catch (error) {
    // Sin base al compilar se genera vacío; en producción el error se propaga
    // para no guardar en caché un feed sin productos.
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Alvian Perfumes</title>
    <link>${SITE_URL}</link>
    <description>Perfumes árabes originales con envíos a todo el Perú</description>
${perfumes.map(item).join('\n')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
