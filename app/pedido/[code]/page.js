import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebOrderByToken, getStoreConfig } from '@/lib/store-db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import SiteHeader from '../../_store/SiteHeader';
import SiteFooter from '../../SiteFooter';
import CheckoutHeader, { CheckoutFooter } from '../../_store/CheckoutHeader';
import CheckoutSteps from '../../_store/CheckoutSteps';
import OrderView, { orderWhatsAppMessage } from '../../_store/OrderView';
import ClearCart from '../../_store/ClearCart';
import MetaPixelPurchase from '../../_store/MetaPixelPurchase';
import { IconCheck } from '../../_store/icons';
import WhatsAppIcon from '../../WhatsAppIcon';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tu pedido',
  robots: { index: false, follow: false },
};

/** Lo que pasa después de comprar, según cómo se paga y cómo se entrega. */
function nextSteps(order, hours) {
  const cod = order.payment_method === 'contraentrega';
  const pickup = /recoj|recog|retir/i.test(order.shipping_name || '');
  return [
    cod
      ? { title: 'Preparamos tu pedido', text: 'Lo alistamos para entregártelo. Pagas al recibirlo.' }
      : {
          title: 'Verificamos tu pago',
          text: order.voucher_url
            ? 'Revisamos la captura que subiste.'
            : 'Si no subiste la captura, envíala por WhatsApp para confirmar más rápido.',
        },
    {
      title: 'Te escribimos por WhatsApp',
      text: `Para confirmar tu pedido${hours ? ` (${hours})` : ''}.`,
    },
    pickup
      ? { title: 'Coordinamos el recojo', text: 'Te indicamos el lugar y la hora en Pucallpa.' }
      : { title: 'Te lo entregamos', text: `${order.shipping_name}. Puedes seguirlo en «Mi pedido».` },
  ];
}

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
  const waHref = buildWhatsAppLink(orderWhatsAppMessage(order));

  // Pedido recién hecho: tercer paso de la compra, sin el menú de la tienda.
  if (isNew) {
    return (
      <>
        <ClearCart />
        <MetaPixelPurchase order={order} />
        <CheckoutHeader backHref="/" backLabel="Seguir comprando" />
        <main className="ck-page">
          <div className="ck-band">
            <div className="ck-wrap">
              <h1>¡Pedido recibido!</h1>
              <span className="ck-band-bar" aria-hidden="true" />
              <CheckoutSteps current={2} tone="dark" />
            </div>
          </div>
          <div className="ck-wrap ck-body ck-done">
            <section className="ck-card ck-done-hero">
              <span className="ck-done-ic" aria-hidden="true">
                <IconCheck size={30} />
              </span>
              <p className="ck-done-label">Tu número de pedido</p>
              <p className="ck-done-code">{order.code}</p>
              {config.payment.thanks ? <p className="ck-done-lead">{config.payment.thanks}</p> : null}
              <a className="ck-btn ck-btn-lg" href={waHref} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon width={20} height={20} /> Enviar mi pedido por WhatsApp
              </a>
              <p className="ck-hint">
                Así lo confirmamos más rápido
                {order.payment_method !== 'contraentrega' && !order.voucher_url ? ' — adjunta ahí tu captura de pago' : ''}.
              </p>
              <Link href="/seguimiento" className="ck-btn ck-btn-secondary">
                Ver «Mi pedido»
              </Link>
            </section>

            <section className="ck-card" aria-labelledby="ck-next">
              <h2 className="ck-card-title" id="ck-next">
                ¿Qué pasa ahora?
              </h2>
              <ol className="ck-next">
                {nextSteps(order, config.business?.hours).map((step, i) => (
                  <li key={step.title}>
                    <span className="ck-num">{i + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="ck-hint">
                Guarda tu código <strong>{order.code}</strong>: con él sigues tu pedido en{' '}
                <Link href="/seguimiento">Mi pedido</Link>.
              </p>
            </section>

            <OrderView order={order} />
          </div>
        </main>
        <CheckoutFooter business={config.business} />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <section className="store-section">
        <div className="wrap narrow">
          <div className="thanks">
            <span className="thanks-ic">
              <IconCheck size={30} />
            </span>
            <h1 className="h2">Pedido {order.code}</h1>
            <p className="muted small">
              Sigue el estado de tu pedido aquí o en <Link href="/seguimiento">Mi pedido</Link>.
            </p>
          </div>
          <OrderView order={order} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
