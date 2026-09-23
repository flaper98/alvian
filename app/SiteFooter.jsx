import Link from 'next/link';
import { getStoreConfig } from '@/lib/store-db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import BrandMark from './_store/BrandMark';
import InstagramIcon from './InstagramIcon';
import TikTokIcon from './TikTokIcon';
import WhatsAppIcon from './WhatsAppIcon';

const INSTAGRAM_URL = 'https://www.instagram.com/alvian_fragancias/';
const TIKTOK_URL = 'https://www.tiktok.com/@alvian_fragancias?lang=es';

export default async function SiteFooter() {
  const { payment, business } = await getStoreConfig();
  const whatsappHref = buildWhatsAppLink(
    'Hola, vengo desde su página web. ¿Me puede dar más información sobre sus perfumes, por favor?',
  );

  return (
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer-community">
        <div>
          <h2>Únete a la comunidad Alvian</h2>
          <p>Lanzamientos, reposiciones y promociones primero en nuestras redes.</p>
        </div>
        <div className="sf-footer-social">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Alvian Perfumes">
            <InstagramIcon width={20} height={20} /> <span>Instagram</span>
          </a>
          <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" aria-label="TikTok de Alvian Perfumes">
            <TikTokIcon width={20} height={20} /> <span>TikTok</span>
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Alvian Perfumes">
            <WhatsAppIcon width={20} height={20} /> <span>WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="sf-wrap sf-footer-grid">
        <div className="sf-footer-brand">
          <Link href="/" className="sf-footer-logo" aria-label="Alvian Perfumes, inicio">
            <BrandMark size={36} ink="#f7f3e6" hole="#0e2b21" />
            <span>ALVIAN</span>
          </Link>
          <h3>Nuestra promesa</h3>
          <p>
            Perfumes árabes 100% originales, con atención personalizada por WhatsApp, entrega en
            Pucallpa y envíos a todo el Perú.
          </p>
        </div>

        <div>
          <h3>Tienda</h3>
          <ul className="sf-footer-info">
            <li>{business.address || 'Pucallpa, Ucayali, Perú'}</li>
            {business.hours ? <li>{business.hours}</li> : null}
            <li>
              WhatsApp:{' '}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                +51 994 379 917
              </a>
            </li>
            {business.email ? (
              <li>
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h3>Enlaces</h3>
          <ul>
            <li>
              <Link href="/#catalogo">Fragancias</Link>
            </li>
            <li>
              <Link href="/#como-comprar">Cómo comprar</Link>
            </li>
            <li>
              <Link href="/nosotros">Quiénes somos</Link>
            </li>
            <li>
              <Link href="/contacto">Contacto</Link>
            </li>
            <li>
              <Link href="/seguimiento">Seguir mi pedido</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Ayuda</h3>
          <ul>
            <li>
              <Link href="/#preguntas">Preguntas frecuentes</Link>
            </li>
            <li>
              <Link href="/terminos">Términos y condiciones</Link>
            </li>
            <li>
              <Link href="/privacidad">Política de privacidad</Link>
            </li>
          </ul>
          <Link className="sf-reclamos" href="/reclamaciones">
            <strong>Libro de Reclamaciones</strong>
            <small>Conforme al Código de Protección al Consumidor</small>
          </Link>
        </div>
      </div>

      <div className="sf-wrap sf-footer-bottom">
        <p>
          © {new Date().getFullYear()} {business.razonSocial || 'Alvian Perfumes'}
          {business.ruc ? ` · RUC ${business.ruc}` : ''} · Pucallpa, Perú · Precios en soles (S/)
        </p>
        <div className="sf-pay" aria-label="Métodos de pago">
          {payment.yapeEnabled ? (
            <>
              <span className="sf-pay-chip sf-pay-yape">Yape</span>
              <span className="sf-pay-chip sf-pay-plin">Plin</span>
            </>
          ) : null}
          {payment.transferEnabled ? <span className="sf-pay-chip">Transferencia</span> : null}
          {payment.cashOnDeliveryEnabled ? <span className="sf-pay-chip">Contra entrega</span> : null}
        </div>
      </div>
    </footer>
  );
}
