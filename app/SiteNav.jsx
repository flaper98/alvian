'use client';

import { useState } from 'react';

const LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#nosotros', label: 'Quiénes somos' },
  { href: '#contacto', label: 'Contacto' },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="site-nav">
      <div className="site-nav-row">
        <a href="#inicio" className="site-nav-brand" onClick={() => setOpen(false)}>
          Alvian
        </a>
        <button
          type="button"
          className={`site-nav-toggle${open ? ' open' : ''}`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
        <ul className="site-nav-links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>

      {open ? (
        <ul className="site-nav-mobile-links">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
