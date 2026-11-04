'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { findSection, isTabActive } from './sections';

export default function SectionTabs({ role, pendingWebOrders = 0 }) {
  const pathname = usePathname();
  const section = findSection(pathname);
  // Una pestaña puede tener sus propios roles (si no, vale la de la sección).
  const tabs = section?.tabs.filter((tab) => !tab.roles || tab.roles.includes(role)) || [];
  if (!section || tabs.length < 2 || !section.roles.includes(role)) return null;

  return (
    <nav className="section-tabs" aria-label={section.label}>
      {tabs.map((tab) => {
        const active = isTabActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`section-tab${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
            {tab.webOrdersBadge && pendingWebOrders > 0 ? (
              <span className="nav-count">{pendingWebOrders}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
