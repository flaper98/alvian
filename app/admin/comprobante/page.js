import { listPerfumes } from '@/lib/db';
import { getStoreConfig } from '@/lib/store-db';
import { phoneLabel } from '@/lib/receipt.mjs';
import { SITE_URL } from '@/lib/seo';
import { WHATSAPP_NUMBER } from '@/lib/whatsapp';
import ReceiptBuilder from './ReceiptBuilder';

export const dynamic = 'force-dynamic';

/** Formas de pago y contacto del pie del comprobante, desde Tienda → Configuración. */
function businessInfo(config, site) {
  const pay = config.payment;
  const payment = [];
  if (pay.yapeEnabled && pay.yapeNumber) {
    payment.push(`Yape o Plin: ${pay.yapeNumber}`);
    if (pay.yapeName) payment.push(`A nombre de ${pay.yapeName}`);
  }
  if (pay.transferEnabled) {
    for (const b of pay.banks || []) {
      if (!b.account) continue;
      payment.push(`${b.bank}: ${b.account}${b.holder ? ` · ${b.holder}` : ''}`);
      if (b.cci) payment.push(`CCI: ${b.cci}`);
    }
  }
  const biz = config.business;
  const contact = [`WhatsApp ${phoneLabel(WHATSAPP_NUMBER)}`, site, biz.email, biz.address];
  if (biz.ruc) contact.push([biz.razonSocial, `RUC ${biz.ruc}`].filter(Boolean).join(' · '));
  return { payment, contact: contact.filter(Boolean) };
}

/** Comprobante en PDF para el cliente: precio normal, descuento, total y cuánto se ahorra. */
export default async function ComprobantePage() {
  let perfumes;
  let config;
  try {
    [perfumes, config] = await Promise.all([listPerfumes(), getStoreConfig()]);
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
  const site = SITE_URL.replace(/^https?:\/\//, '');

  return (
    <section className="admin-section receipt-page">
      <div className="admin-header no-print">
        <div>
          <h1>Comprobante</h1>
          <p className="dist-lead">
            Arma el comprobante cuando le haces precio a un cliente: muestra el precio normal, el descuento de cada
            perfume, el total a pagar y cuánto se ahorra. Descárgalo en PDF o cópialo para WhatsApp.
          </p>
        </div>
      </div>
      <ReceiptBuilder
        perfumes={items}
        issuedAt={new Date().toISOString()}
        site={site}
        whatsapp={WHATSAPP_NUMBER}
        business={businessInfo(config, site)}
      />
    </section>
  );
}
