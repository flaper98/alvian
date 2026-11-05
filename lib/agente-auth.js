import { timingSafeEqual } from 'node:crypto';

// Comprueba el token que manda el agente en la cabecera x-agente-token.
// La comparación es de tiempo constante para que nadie pueda adivinar el token
// midiendo cuánto tarda la respuesta.
export function tokenOk(request) {
  // Sin token configurado, las rutas del agente quedan cerradas.
  return sameSecret(request.headers.get('x-agente-token') || '', process.env.AGENTE_TOKEN);
}

// Las tareas programadas de Vercel (vercel.json → crons) llaman con
// "Authorization: Bearer <CRON_SECRET>". Sin CRON_SECRET, quedan cerradas.
export function cronOk(request) {
  const expected = process.env.CRON_SECRET;
  return Boolean(expected) && sameSecret(request.headers.get('authorization') || '', `Bearer ${expected}`);
}

function sameSecret(received, expected) {
  if (!expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
