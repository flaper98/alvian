import Link from 'next/link';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';

export const metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteNav />

      <section className="about-section">
        <h1 className="section-title">No encontramos esta página</h1>
        <p className="about-text">
          Puede que el perfume ya no esté disponible o que el enlace haya cambiado. Mira nuestro
          catálogo de perfumes originales o vuelve al inicio.
        </p>
        <p>
          <Link href="/#catalogo" className="btn-outline-pill">
            Ver perfumes
          </Link>{' '}
          <Link href="/" className="btn-outline-pill">
            Ir al inicio
          </Link>
        </p>
      </section>

      <SiteFooter />

      <WhatsAppFloatingButton />
    </>
  );
}
