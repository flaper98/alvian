import { getStoreConfig } from '@/lib/store-db';
import CheckoutHeader, { CheckoutFooter } from '../_store/CheckoutHeader';
import CheckoutSteps from '../_store/CheckoutSteps';
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
      <CheckoutHeader backHref="/carrito" backLabel="Volver al carrito" />
      <main className="ck-page">
        <div className="ck-band">
          <div className="ck-wrap">
            <h1>Finalizar compra</h1>
            <span className="ck-band-bar" aria-hidden="true" />
            <CheckoutSteps current={1} tone="dark" />
          </div>
        </div>
        <div className="ck-wrap ck-body">
          <CheckoutForm config={config} />
        </div>
      </main>
      <CheckoutFooter business={config.business} />
    </>
  );
}
