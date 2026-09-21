'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import {
  IconHome,
  IconBottle,
  IconCart,
  IconReceipt,
  IconWallet,
  IconCoin,
  IconUser,
  IconClipboard,
  IconTruck,
  IconRepeat,
  IconExpense,
  IconImage,
} from './icons';

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', roles: ['admin', 'vendedora'], icon: IconHome },
  { href: '/admin/catalogo', label: 'Catálogo', roles: ['admin'], icon: IconBottle },
  { href: '/admin/banners', label: 'Banners de inicio', roles: ['admin'], icon: IconImage },
  { href: '/admin/compras', label: 'Compras', roles: ['admin'], icon: IconCart },
  { href: '/admin/gastos', label: 'Gastos', roles: ['admin'], icon: IconExpense },
  { href: '/admin/proveedores', label: 'Proveedores', roles: ['admin'], icon: IconTruck },
  {
    href: '/admin/pedidos',
    label: 'Pedidos',
    roles: ['admin', 'vendedora'],
    icon: IconClipboard,
  },
  { href: '/admin/ventas', label: 'Ventas', roles: ['admin', 'vendedora'], icon: IconReceipt },
  {
    href: '/admin/creditos',
    label: 'Crédito / Pandero',
    roles: ['admin', 'vendedora'],
    icon: IconWallet,
  },
  {
    href: '/admin/panderos',
    label: 'Panderos',
    roles: ['admin', 'vendedora'],
    icon: IconRepeat,
  },
  { href: '/admin/comisiones', label: 'Comisiones', roles: ['admin', 'vendedora'], icon: IconCoin },
  { href: '/admin/usuarios', label: 'Usuarios', roles: ['admin'], icon: IconUser },
];

const ROLE_LABELS = {
  admin: 'Administrador',
  vendedora: 'Vendedora',
};

export default function AdminNav({ role, name }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-row">
        <div className="admin-brand-block">
          <span className="admin-brand">Alvian Admin</span>
          <span className="admin-role-badge">{name || ROLE_LABELS[role] || role}</span>
        </div>
        <button
          type="button"
          className={`hamburger-btn${open ? ' open' : ''}`}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`admin-nav-backdrop${open ? ' open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <nav className={`admin-nav-panel${open ? ' open' : ''}`} aria-hidden={!open}>
        <ul>
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active ? 'active' : ''}
                  onClick={() => setOpen(false)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="admin-nav-footer">
          <a href="/" className="back-link">
            ← Ver sitio público
          </a>
          <form action={logoutAction}>
            <button type="submit" className="btn-nav-logout">
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
