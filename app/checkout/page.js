import { getStoreConfig } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';
import CheckoutForm from './CheckoutForm';

export const metadata = {
  title: 'Finalizar compra',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const config = await getStoreConfig();
  return (
    <>
      <SiteHeader />
      <section className="store-section checkout-section">
        <div className="wrap">
          <div className="checkout-head">
            <h1 className="h2">Finalizar compra</h1>
            <ol className="progress">
              <li className="done">Carrito</li>
              <li className="on">Datos y pago</li>
              <li>Confirmación</li>
            </ol>
          </div>
          <CheckoutForm config={config} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
