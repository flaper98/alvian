import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import InstagramIcon from './InstagramIcon';
import TikTokIcon from './TikTokIcon';
import WhatsAppIcon from './WhatsAppIcon';

const INSTAGRAM_URL = 'https://www.instagram.com/alvian_fragancias/';
const TIKTOK_URL = 'https://www.tiktok.com/@alvian_fragancias?lang=es';

export default function SiteFooter() {
  const whatsappHref = buildWhatsAppLink(
    'Hola, vengo desde su página web. ¿Me puede dar más información sobre sus perfumes, por favor?',
  );

  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <p className="site-footer-logo">Alvian</p>
          <p className="site-footer-tagline">
            Perfumería en Pucallpa, Perú. Fragancias 100% originales, con atención personalizada
            por WhatsApp, entrega en Pucallpa y envíos a todo el Perú.
          </p>
        </div>

        <div className="site-footer-links">
          <h3>Enlaces</h3>
          <ul>
            <li>
              <a href="/#inicio">Inicio</a>
            </li>
            <li>
              <a href="/#catalogo">Fragancias</a>
            </li>
            <li>
              <Link href="/nosotros">Quiénes somos</Link>
            </li>
            <li>
              <Link href="/contacto">Contacto</Link>
            </li>
          </ul>
        </div>

        <div className="site-footer-social">
          <h3>Síguenos</h3>
          <div className="site-footer-social-icons">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Alvian Perfumes"
            >
              <InstagramIcon width={20} height={20} />
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok de Alvian Perfumes"
            >
              <TikTokIcon width={20} height={20} />
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp de Alvian Perfumes"
            >
              <WhatsAppIcon width={20} height={20} />
            </a>
          </div>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>© {new Date().getFullYear()} Alvian Perfumes · Perfumería en Pucallpa, Perú</p>
      </div>
    </footer>
  );
}
