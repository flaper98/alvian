// Categorías del reparto tipo "Profit First". Los porcentajes NO viven aquí: se
// guardan en la base (pf_plans / pf_plan_items) y se editan desde el panel.
// PF_DEFAULT_PERCENTS solo se usa una vez, para sembrar el primer plan.
export const PF_CATEGORIES = [
  { key: 'ganancia', label: 'Ganancia', hint: 'Tu utilidad real. Se acumula, no se toca.' },
  { key: 'sueldo', label: 'Mi sueldo', hint: 'Lo que puedes retirar para ti.' },
  { key: 'impuestos', label: 'Impuestos', hint: 'Apártalo en una cuenta aparte para pagar a la SUNAT.' },
  { key: 'operativos', label: 'Gastos operativos', hint: 'Gastos del negocio y comisiones.' },
  { key: 'deuda', label: 'Pago de deuda', hint: 'Cuotas y abonos a deudas.' },
];

export const PF_CATEGORY_KEYS = PF_CATEGORIES.map((category) => category.key);

export const PF_DEFAULT_PERCENTS = {
  ganancia: 7,
  sueldo: 35,
  impuestos: 15,
  operativos: 33,
  deuda: 10,
};

// Base sobre la que se reparte cada ingreso:
// - neto: lo que entró menos lo que reinvertiste en perfumes con ganancias.
// - bruto: todo lo que entró.
export const PF_BASES = {
  neto: 'Sobre lo que queda tras reponer mercadería',
  bruto: 'Sobre todo lo que entra',
};

// Categorías cuyas salidas se anotan a mano. "Mi sueldo" sale de Retiros y
// "Gastos operativos" de Gastos y Comisiones, que ya existen en el panel.
export const PF_MANUAL_OUTFLOW_CATEGORIES = ['ganancia', 'impuestos', 'deuda'];

export function pfCategoryLabel(key) {
  return PF_CATEGORIES.find((category) => category.key === key)?.label || key;
}
