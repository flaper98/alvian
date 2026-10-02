import {
  IconHome,
  IconChart,
  IconClipboard,
  IconReceipt,
  IconRepeat,
  IconBottle,
  IconCart,
  IconExpense,
  IconStore,
  IconUser,
} from './icons';

const ALL = ['admin', 'vendedora'];
const ADMIN = ['admin'];

// Cada sección es una opción del menú; si tiene varias pestañas, se muestran
// arriba de la página y el menú la marca activa en cualquiera de ellas.
export const SECTIONS = [
  { label: 'Resumen', icon: IconHome, roles: ALL, tabs: [{ href: '/admin', label: 'Resumen' }] },
  { label: 'Reportes', icon: IconChart, roles: ADMIN, tabs: [{ href: '/admin/reportes', label: 'Reportes' }] },
  {
    label: 'Pedidos',
    icon: IconClipboard,
    roles: ALL,
    tabs: [
      { href: '/admin/pedidos-web', label: 'Tienda web', webOrdersBadge: true },
      { href: '/admin/pedidos', label: 'Encargos' },
      { href: '/admin/envios', label: 'Envíos Shalom' },
    ],
  },
  {
    label: 'Ventas',
    icon: IconReceipt,
    roles: ALL,
    tabs: [
      { href: '/admin/ventas', label: 'Ventas' },
      { href: '/admin/creditos', label: 'Por cobrar' },
      { href: '/admin/comisiones', label: 'Comisiones' },
    ],
  },
  { label: 'Panderos', icon: IconRepeat, roles: ALL, tabs: [{ href: '/admin/panderos', label: 'Panderos' }] },
  { label: 'Catálogo', icon: IconBottle, roles: ADMIN, tabs: [{ href: '/admin/catalogo', label: 'Catálogo' }] },
  {
    label: 'Compras',
    icon: IconCart,
    roles: ADMIN,
    tabs: [
      { href: '/admin/compras', label: 'Historial' },
      { href: '/admin/proveedores', label: 'Proveedores y precios' },
    ],
  },
  {
    // Una sola caja: todo el dinero que entra y sale se registra en "Caja".
    // "Distribución" reemplaza al antiguo Reparto (/admin/profit-first redirige ahí).
    label: 'Caja',
    icon: IconExpense,
    roles: ADMIN,
    tabs: [
      { href: '/admin/caja', label: 'Caja' },
      { href: '/admin/distribucion', label: 'Distribución' },
      { href: '/admin/deudas', label: 'Deudas' },
      { href: '/admin/gastos', label: 'Gastos' },
      { href: '/admin/perdidas', label: 'Pérdidas' },
    ],
  },
  {
    label: 'Tienda online',
    icon: IconStore,
    roles: ADMIN,
    tabs: [
      { href: '/admin/tienda', label: 'Ajustes' },
      { href: '/admin/banners', label: 'Banners' },
      { href: '/admin/reclamos', label: 'Reclamos' },
    ],
  },
  { label: 'Usuarios', icon: IconUser, roles: ADMIN, tabs: [{ href: '/admin/usuarios', label: 'Usuarios' }] },
];

export function isTabActive(pathname, href) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function findSection(pathname) {
  return SECTIONS.find((section) => section.tabs.some((tab) => isTabActive(pathname, tab.href)));
}
