import { getStoreConfig } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';

export const revalidate = 3600;

export const metadata = {
  title: 'Términos y condiciones',
  alternates: { canonical: '/terminos' },
};

export default async function TerminosPage() {
  const { business } = await getStoreConfig();
  const name = business.razonSocial || 'Alvian Perfumes';
  return (
    <>
      <SiteHeader />
      <section className="store-section">
        <article className="wrap narrow legal">
          <h1 className="h2">Términos y condiciones</h1>
          <p>
            Al comprar en este sitio aceptas estas condiciones. El vendedor es {name}
            {business.ruc ? `, RUC ${business.ruc}` : ''}, con domicilio en {business.address}.
          </p>
          <h2>Productos y precios</h2>
          <p>
            Todos los precios están en soles (S/) e incluyen los impuestos aplicables. Las fotos son
            referenciales. Los precios y el stock pueden cambiar sin previo aviso; el precio válido es
            el que ves al confirmar tu pedido.
          </p>
          <h2>Pedidos y pagos</h2>
          <p>
            Tu pedido queda confirmado cuando verificamos el pago (Yape, Plin o transferencia) o, en
            el caso de pago contra entrega en Pucallpa, cuando lo coordinamos contigo por WhatsApp. Si
            un producto se agotó después de tu pedido, te ofreceremos un cambio o la devolución total
            de tu dinero.
          </p>
          <h2>Envíos</h2>
          <p>
            En Pucallpa entregamos el mismo día o al día siguiente. A provincias enviamos por agencia
            (Shalom, Olva u otra acordada) en 2 a 5 días hábiles; los plazos de la agencia no dependen
            de nosotros. Te compartiremos la clave o código de seguimiento del envío.
          </p>
          <h2>Cambios y devoluciones</h2>
          <p>
            Por higiene, solo aceptamos cambios de productos sellados y sin uso, dentro de los 7 días
            de recibidos, o cuando el producto llegue dañado o no corresponda a lo comprado. Escríbenos
            por WhatsApp con fotos del producto y tu código de pedido.
          </p>
          <h2>Libro de Reclamaciones</h2>
          <p>
            Conforme al Código de Protección y Defensa del Consumidor, contamos con un Libro de
            Reclamaciones virtual disponible en <a href="/reclamaciones">/reclamaciones</a>.
          </p>
        </article>
      </section>
      <SiteFooter />
    </>
  );
}
