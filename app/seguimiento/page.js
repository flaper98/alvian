import { findWebOrderForTracking } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';
import OrderView from '../_store/OrderView';
import { IconSearch } from '../_store/icons';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Seguir mi pedido',
  description: 'Consulta el estado de tu pedido en Alvian Perfumes con tu código y celular.',
  alternates: { canonical: '/seguimiento' },
};

export default async function SeguimientoPage({ searchParams }) {
  const params = await searchParams;
  const code = String(params.c || '').trim().toUpperCase().slice(0, 20);
  const phone = String(params.tel || '').slice(0, 20);
  let order = null;
  let error = '';
  if (code && phone) {
    try {
      order = await findWebOrderForTracking(code, phone);
    } catch (e) {
      order = null;
    }
    if (!order) error = 'No encontramos un pedido con esos datos. Revisa el código y el celular.';
  }

  return (
    <>
      <SiteHeader />
      <section className="store-section">
        <div className="wrap narrow">
          <div className="section-head">
            <p className="eyebrow">Seguimiento</p>
            <h1 className="h2">¿Dónde está mi pedido?</h1>
            <p className="lead">Ingresa tu código de pedido y el celular con el que compraste.</p>
          </div>
          <form className="track-form" method="get">
            <label className="field">
              Código de pedido
              <input name="c" placeholder="ALV-01001" defaultValue={code} required />
            </label>
            <label className="field">
              Celular
              <input name="tel" inputMode="tel" placeholder="999 999 999" defaultValue={phone} required />
            </label>
            <button className="btn-gold" type="submit">
              Buscar <IconSearch size={18} />
            </button>
          </form>
          {error ? <p className="alert alert-error">{error}</p> : null}
          {order ? <OrderView order={order} /> : null}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
