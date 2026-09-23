import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebOrderByToken, getStoreConfig } from '@/lib/store-db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import SiteHeader from '../../_store/SiteHeader';
import SiteFooter from '../../SiteFooter';
import OrderView, { orderWhatsAppMessage } from '../../_store/OrderView';
import ClearCart from '../../_store/ClearCart';
import { IconCheck } from '../../_store/icons';
import WhatsAppIcon from '../../WhatsAppIcon';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
};

export default async function PedidoPage({ params, searchParams }) {
  const { code } = await params;
  const { t, nuevo } = await searchParams;
  let order = null;
  try {
    order = await getWebOrderByToken(String(code), String(t || ''));
  } catch (error) {
    order = null;
  }
  if (!order) notFound();
  const config = await getStoreConfig();
  const isNew = nuevo === '1';

  return (
    <>
      <SiteHeader />
      {isNew ? <ClearCart /> : null}
      <section className="store-section">
        <div className="wrap narrow">
          <div className="thanks">
            <span className="thanks-ic">
              <IconCheck size={30} />
            </span>
            <h1 className="h2">{isNew ? '¡Pedido recibido!' : `Pedido ${order.code}`}</h1>
            {isNew ? <p className="lead">{config.payment.thanks}</p> : null}
            <p className="muted small">
              Guarda tu código <strong>{order.code}</strong> para seguir tu pedido en{' '}
              <Link href="/seguimiento">Mi pedido</Link>.
            </p>
            {isNew ? (
              <a
                className="btn-whatsapp btn-lg"
                href={buildWhatsAppLink(orderWhatsAppMessage(order))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon width={20} height={20} /> Enviar mi pedido por WhatsApp
              </a>
            ) : null}
            {isNew ? (
              <p className="muted small">
                Así lo confirmamos más rápido{order.payment_method !== 'contraentrega' && !order.voucher_url ? ' — adjunta ahí tu captura de pago' : ''}.
              </p>
            ) : null}
          </div>
          <OrderView order={order} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
