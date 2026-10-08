// Tipos de movimiento de dinero (el `src` de cada fila del libro de caja,
// lib/reports.js) agrupados como en los reportes, con la sección del panel
// donde se ve o se corrige cada uno. Sin imports de servidor: lo usan
// páginas y componentes del navegador.

export const LEDGER_GROUPS = {
  venta: { label: 'Ventas al contado', srcs: ['venta'], section: '/admin/ventas', sectionLabel: 'Ventas' },
  abono: { label: 'Abonos de crédito', srcs: ['abono'], section: '/admin/creditos', sectionLabel: 'Por cobrar' },
  pandero: { label: 'Cuotas de pandero', srcs: ['pandero'], section: '/admin/panderos', sectionLabel: 'Panderos' },
  compra: { label: 'Compras de mercadería', srcs: ['compra'], section: '/admin/compras', sectionLabel: 'Compras' },
  gasto: { label: 'Gastos', srcs: ['gasto'], section: '/admin/gastos', sectionLabel: 'Gastos' },
  comision: {
    label: 'Comisiones pagadas',
    srcs: ['comision'],
    section: '/admin/comisiones',
    sectionLabel: 'Comisiones',
  },
  retiro: { label: 'Retiros (mi sueldo)', srcs: ['retiro'], section: '/admin/caja', sectionLabel: 'Caja' },
  deuda: { label: 'Pago de deudas', srcs: ['deuda'], section: '/admin/deudas', sectionLabel: 'Deudas' },
  otras: {
    label: 'Impuestos, reserva y otras',
    srcs: ['reparto', 'sobre'],
    section: '/admin/caja',
    sectionLabel: 'Caja',
  },
  aporte: { label: 'Puse dinero', srcs: ['aporte'], section: '/admin/tu-dinero', sectionLabel: 'Tu dinero' },
};

/** Grupo al que pertenece un `src` del libro de caja (ej. 'sobre' → 'otras'). */
export function groupOfSrc(src) {
  return Object.keys(LEDGER_GROUPS).find((key) => LEDGER_GROUPS[key].srcs.includes(src)) || null;
}

/** Sección del panel donde está el movimiento (para enlazar cada fila). */
export function sectionOfSrc(src) {
  const group = groupOfSrc(src);
  return group ? LEDGER_GROUPS[group].section : null;
}

/**
 * Enlace a la lista de movimientos de Reportes filtrada por tipo y período.
 * `period` = { periodo, desde, hasta } (los mismos parámetros de Reportes).
 */
export function movementsHref(group, period = {}) {
  const params = new URLSearchParams({ vista: 'movimientos' });
  if (group) params.set('tipo', group);
  for (const key of ['periodo', 'desde', 'hasta']) {
    if (period[key]) params.set(key, period[key]);
  }
  return `/admin/reportes?${params.toString()}`;
}
