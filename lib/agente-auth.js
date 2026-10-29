import { timingSafeEqual } from 'node:crypto';

// Comprueba el token que manda el agente en la cabecera x-agente-token.
// La comparación es de tiempo constante para que nadie pueda adivinar el token
// midiendo cuánto tarda la respuesta.
export function tokenOk(request) {
  const expected = process.env.AGENTE_TOKEN;
  // Sin token configurado, las rutas del agente quedan cerradas.
  if (!expected) return false;

  const received = request.headers.get('x-agente-token') || '';
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
