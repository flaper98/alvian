import { getStoreConfig } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';
import CheckoutSteps from '../_store/CheckoutSteps';
import CartPage from './CartPage';

export const metadata = {
  title: 'Carrito de compras',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CarritoPage() {
  const config = await getStoreConfig();
  return (
    <>
      <SiteHeader />
      <section className="store-section checkout-section">
        <div className="wrap">
          <div className="checkout-head">
            <h1 className="h2">Carrito de compras</h1>
            <CheckoutSteps current={0} />
          </div>
          <CartPage
            shipping={config.shipping.options.map((o) => ({ id: o.id, name: o.name, price: Number(o.price) || 0 }))}
            freeFrom={Number(config.shipping.freeFrom) || 0}
            payment={{
              yape: config.payment.yapeEnabled,
              transfer: config.payment.transferEnabled,
              cod: config.payment.cashOnDeliveryEnabled,
            }}
          />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
