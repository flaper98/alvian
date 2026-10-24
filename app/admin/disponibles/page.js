import { listPerfumes } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import StockPoster from './StockPoster';

export const dynamic = 'force-dynamic';

/** Perfumes con stock y su precio, para mandar captura o texto a los clientes. */
export default async function DisponiblesPage() {
  let perfumes;
  try {
    perfumes = await listPerfumes();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Lista para clientes</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Al cliente no se le muestra cuánto stock hay: solo si quedan pocas unidades.
  const items = perfumes
    .filter((p) => Number(p.stock) > 0 && Number(p.price) > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      category: p.category || '',
      price: Number(p.price),
      comparePrice: p.compare_price != null && Number(p.compare_price) > Number(p.price) ? Number(p.compare_price) : null,
      image: p.image_url || null,
      last: Number(p.stock) <= 2,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const today = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(new Date());

  return (
    <section className="admin-section">
      <div className="admin-header">
        <div>
          <h1>Lista para clientes</h1>
          <p className="dist-lead">
            Los perfumes que tienes hoy y su precio. Toma captura de la tarjeta o copia el texto para WhatsApp.
          </p>
        </div>
      </div>
      <StockPoster
        items={items}
        today={today}
        site={SITE_URL.replace(/^https?:\/\//, '')}
        whatsapp={WHATSAPP_NUMBER}
      />
    </section>
  );
}
