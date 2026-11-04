// Formato de moneda y porcentajes en es-PE, para no armar "S/ " a mano.

const SOLES = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SOLES_ROUND = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const finite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** S/ 1,250.00 · −S/ 80.00 (nunca NaN ni Infinity). */
export function formatSoles(value, { round = false } = {}) {
  const n = finite(value);
  const text = (round ? SOLES_ROUND : SOLES).format(Math.abs(n));
  return `${n < 0 ? '−' : ''}S/ ${text}`;
}

/** 0.324 → "32.4%"; null o no numérico → "—". */
export function formatPercent(ratio) {
  if (ratio == null || !Number.isFinite(Number(ratio))) return '—';
  return `${PERCENT.format(Number(ratio) * 100)}%`;
}
