// "¿Para qué?" de cada movimiento de tu dinero en la caja.
// - aporte ("Puse dinero"): dinero tuyo que entra a la caja del negocio.
// - retiro ("Saqué para mí"): dinero que sacas de la caja para ti.
export const CASH_PURPOSES = {
  aporte: [
    { key: 'mercaderia', label: 'Para comprar mercadería' },
    { key: 'gastos', label: 'Para pagar gastos' },
    { key: 'deuda', label: 'Para pagar una deuda' },
    { key: 'caja', label: 'Para tener dinero en caja' },
    { key: 'otro', label: 'Otro' },
  ],
  retiro: [
    { key: 'sueldo', label: 'Mi sueldo' },
    { key: 'personal', label: 'Gasto personal' },
    { key: 'ahorro', label: 'Ahorro' },
    { key: 'otro', label: 'Otro' },
  ],
};

export function cashPurposeLabel(kind, key) {
  return CASH_PURPOSES[kind]?.find((p) => p.key === key)?.label || (kind === 'retiro' ? 'Mi sueldo' : 'Otro');
}

export function isValidCashPurpose(kind, key) {
  return Boolean(CASH_PURPOSES[kind]?.some((p) => p.key === key));
}
