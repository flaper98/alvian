'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CartButton from './_store/CartButton';
import BrandMark from './_store/BrandMark';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppIcon from './WhatsAppIcon';

const LINKS = [
  { href: '/#catalogo', label: 'Fragancias' },
  { href: '/#como-comprar', label: 'Cómo comprar' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/seguimiento', label: 'Mi pedido' },
  { href: '/contacto', label: 'Contacto' },
];

const WA_HREF = buildWhatsAppLink(
  'Hola, vengo desde su página web. ¿Me puede asesorar para elegir un perfume?',
);

/** Menú estilo "boutique": enlaces a la izquierda, marca al centro, carrito a la derecha. */
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Evita que la página se desplace detrás del menú móvil abierto.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <nav className={`sf-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Principal">
      <div className="sf-nav-row">
        <button
          type="button"
          className={`sf-nav-toggle${open ? ' open' : ''}`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="sf-mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <ul className="sf-nav-links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={pathname === link.href ? 'is-active' : undefined}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/" className="sf-brand" aria-label="Alvian Perfumes, inicio">
          <BrandMark size={30} />
          <span>ALVIAN</span>
        </Link>

        <div className="sf-nav-actions">
          <a
            className="sf-nav-wa"
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Asesoría por WhatsApp"
          >
            <WhatsAppIcon width={18} height={18} />
            <span>Asesoría</span>
          </a>
          <CartButton />
        </div>
      </div>

      <div
        id="sf-mobile-menu"
        className={`sf-mobile-menu${open ? ' open' : ''}`}
        hidden={!open}
      >
        <ul>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <a className="sf-btn sf-btn-wa" href={WA_HREF} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon width={18} height={18} /> Asesoría por WhatsApp
        </a>
      </div>
    </nav>
  );
}
