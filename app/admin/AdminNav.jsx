'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', roles: ['admin', 'vendedora'] },
  { href: '/admin/catalogo', label: 'Catálogo', roles: ['admin'] },
  { href: '/admin/compras', label: 'Compras', roles: ['admin'] },
  { href: '/admin/ventas', label: 'Ventas', roles: ['admin', 'vendedora'] },
  { href: '/admin/creditos', label: 'Crédito / Pandero', roles: ['admin', 'vendedora'] },
  { href: '/admin/comisiones', label: 'Comisiones', roles: ['admin', 'vendedora'] },
];

export default function AdminNav({ role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-row">
        <span className="admin-brand">Alvian Admin</span>
        <button
          type="button"
          className="hamburger-btn"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open ? (
        <nav className="admin-nav-panel">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={pathname === item.href ? 'active' : ''}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="admin-nav-footer">
            <a href="/" className="back-link">
              ← Ver sitio público
            </a>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary">
                Cerrar sesión
              </button>
            </form>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
