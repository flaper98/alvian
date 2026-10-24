import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppIcon from '../WhatsAppIcon';
import BrandMark from './BrandMark';

const HELP_HREF = buildWhatsAppLink('Hola, estoy comprando en la web y tengo una duda.');

/**
 * Cabecera del checkout y de la confirmación: sin menú, para no distraer.
 * Solo volver, el logo y la ayuda por WhatsApp.
 */
export default function CheckoutHeader({ backHref = '/carrito', backLabel = 'Volver al carrito' }) {
  return (
    <header className="ck-top">
      <div className="ck-top-row">
        <Link href={backHref} className="ck-top-back">
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
        <Link href="/" className="ck-top-brand" aria-label="Alvian Perfumes, inicio">
          <BrandMark size={28} />
          <span>ALVIAN</span>
        </Link>
        <a className="ck-top-help" href={HELP_HREF} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={18} height={18} aria-hidden="true" />
          <span>
            ¿Dudas? <b>Escríbenos</b>
          </span>
        </a>
      </div>
    </header>
  );
}

/** Pie corto del checkout: lo legal a la vista (Libro de Reclamaciones incluido). */
export function CheckoutFooter({ business = {} }) {
  return (
    <footer className="ck-foot">
      <p>
        © {new Date().getFullYear()} {business.razonSocial || 'Alvian Perfumes'}
        {business.ruc ? ` · RUC ${business.ruc}` : ''} · Pucallpa, Perú
      </p>
      <nav aria-label="Información legal">
        <Link href="/terminos">Términos y condiciones</Link>
        <Link href="/privacidad">Política de privacidad</Link>
        <Link href="/reclamaciones">Libro de Reclamaciones</Link>
      </nav>
      <p className="ck-foot-credit">
        Desarrollado por <strong>Flaper</strong> · Sistemas de gestión ·{' '}
        <a href="https://wa.me/51921590084" target="_blank" rel="noopener noreferrer">
          +51 921 590 084
        </a>
      </p>
    </footer>
  );
}
