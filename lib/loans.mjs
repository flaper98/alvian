// Préstamos en cuotas (ej. Crédito Yape Negocio). Lógica pura (sin base de
// datos) para poder probarla con `npm test`. Fechas como texto 'YYYY-MM-DD'
// (sin hora) para que la zona horaria nunca cambie el día.
import { fromCents, toCents } from './distribucion.mjs';

const DAY_MS = 24 * 3600 * 1000;

/** Suma meses a una fecha 'YYYY-MM-DD'. Si el día no existe (31 → febrero), usa el último día de ese mes. */
export function addMonths(isoDate, months) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Días desde `fromIso` hasta `toIso` (negativo si `toIso` ya pasó). */
export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

/** Total a pagar y fechas de un préstamo de cuotas iguales, una por mes. */
export function installmentPlan({ installments, installmentAmount, firstDueDate }) {
  const count = Math.round(Number(installments));
  const dueDates = Array.from({ length: count }, (_, index) => addMonths(firstDueDate, index));
  return {
    total: fromCents(count * toCents(installmentAmount)),
    dueDates,
    lastDueDate: dueDates[dueDates.length - 1] || null,
  };
}

/**
 * En qué cuota va un préstamo según lo que ya se pagó. `nextAmount` es lo que
 * falta para completar la próxima cuota (menos que la cuota si se abonó una parte).
 */
export function loanStatus({ installments, installmentAmount, firstDueDate, paid }) {
  const count = Math.round(Number(installments));
  const cuota = toCents(installmentAmount);
  const paidCents = Math.max(toCents(paid), 0);
  const paidInstallments = cuota > 0 ? Math.min(count, Math.floor(paidCents / cuota)) : 0;
  const done = paidInstallments >= count;
  const left = Math.max(count * cuota - paidCents, 0);
  return {
    paidInstallments,
    remainingInstallments: count - paidInstallments,
    nextNumber: done ? null : paidInstallments + 1,
    nextDueDate: done ? null : addMonths(firstDueDate, paidInstallments),
    nextAmount: done ? 0 : fromCents(Math.max(Math.min(cuota - (paidCents - paidInstallments * cuota), left), 0)),
    lastDueDate: addMonths(firstDueDate, count - 1),
  };
}

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * Meses hasta que el dueño junte `target` soles sacando cada mes `ownerShare`
 * (0 a 1) de la utilidad mensual. Las cuotas de los préstamos se pagan
 * primero con la utilidad, así que mientras duran el dueño saca menos.
 * Devuelve null si nunca llega (no saca nada o no hay utilidad).
 *
 * @param {number} target
 * @param {{ monthlyProfit: number, ownerShare?: number,
 *           loans?: { installmentAmount: number, remainingInstallments: number }[] }} options
 */
export function monthsToReach(target, { monthlyProfit, ownerShare = 1, loans = [] }) {
  if (!(target > 0)) return 0;
  if (!(monthlyProfit > 0) || !(ownerShare > 0)) return null;
  const full = monthlyProfit * ownerShare;
  const loanMonths = Math.max(0, ...loans.map((loan) => loan.remainingInstallments));
  let saved = 0;
  // Mes a mes mientras quedan cuotas; después el dueño saca siempre lo mismo.
  for (let month = 0; month < loanMonths; month += 1) {
    const cuotas = loans.reduce(
      (sum, loan) => sum + (month < loan.remainingInstallments ? Number(loan.installmentAmount) : 0),
      0,
    );
    const take = Math.min(full, Math.max(monthlyProfit - cuotas, 0));
    if (take > 0 && saved + take >= target) return round1(month + (target - saved) / take);
    saved += take;
  }
  return round1(loanMonths + (target - saved) / full);
}
