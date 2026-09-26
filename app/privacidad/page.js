import { getStoreConfig } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';

export const revalidate = 3600;

const DESCRIPTION =
  'Política de privacidad de Alvian Perfumes: qué datos personales usamos al comprar, para qué los usamos y cómo ejercer tus derechos, conforme a la Ley N.° 29733.';

export const metadata = {
  title: 'Política de privacidad',
  description: DESCRIPTION,
  alternates: { canonical: '/privacidad' },
  openGraph: {
    title: 'Política de privacidad | Alvian Perfumes',
    description: DESCRIPTION,
    url: '/privacidad',
    type: 'website',
  },
};

export default async function PrivacidadPage() {
  const { business } = await getStoreConfig();
  const name = business.razonSocial || 'Alvian Perfumes';
  return (
    <>
      <SiteHeader />
      <section className="store-section">
        <article className="wrap narrow legal">
          <h1 className="h2">Política de privacidad</h1>
          <p>
            {name} protege tus datos personales conforme a la Ley N.° 29733, Ley de Protección de
            Datos Personales, y su reglamento.
          </p>
          <h2>Qué datos usamos</h2>
          <p>
            Nombre, celular, correo, documento y dirección de entrega que ingresas al comprar, y la
            captura de tu pago si la subes.
          </p>
          <h2>Para qué</h2>
          <p>
            Solo para procesar y entregar tu pedido, comunicarnos contigo por WhatsApp sobre él,
            atender reclamos y cumplir obligaciones legales o tributarias. No vendemos ni compartimos
            tus datos con terceros, salvo la agencia de envío cuando es necesario para la entrega.
          </p>
          <h2>Tus derechos</h2>
          <p>
            Puedes pedir acceso, rectificación o eliminación de tus datos escribiéndonos por WhatsApp
            {business.email ? ` o a ${business.email}` : ''}.
          </p>
        </article>
      </section>
      <SiteFooter />
    </>
  );
}
