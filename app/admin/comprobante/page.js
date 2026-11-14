import { listPerfumes } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import ReceiptBuilder from './ReceiptBuilder';

export const dynamic = 'force-dynamic';

/** Comprobante en PDF para el cliente: precio normal, descuento, total y cuánto se ahorra. */
export default async function ComprobantePage() {
  let perfumes;
  try {
    perfumes = await listPerfumes();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Comprobante</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  // Solo lo que el buscador necesita: también los sin stock (encargos).
  const items = perfumes
    .filter((p) => Number(p.price) > 0)
    .map((p) => ({ id: p.id, name: p.name, price: Number(p.price), stock: Number(p.stock) || 0, image_url: p.image_url || null }));

  return (
    <section className="admin-section receipt-page">
      <div className="admin-header no-print">
        <div>
          <h1>Comprobante</h1>
          <p className="dist-lead">
            Arma el comprobante cuando le haces precio a un cliente: muestra el precio normal, el descuento, el total a
            pagar y cuánto se ahorra. Descárgalo en PDF o cópialo para WhatsApp.
          </p>
        </div>
      </div>
      <ReceiptBuilder
        perfumes={items}
        issuedAt={new Date().toISOString()}
        site={SITE_URL.replace(/^https?:\/\//, '')}
        whatsapp={WHATSAPP_NUMBER}
      />
    </section>
  );
}
