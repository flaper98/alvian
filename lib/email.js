// Envío de correos con Resend (https://resend.com), por su API HTTP.
// Variables: RESEND_API_KEY y, opcional, INFORME_EMAIL_FROM. Sin dominio
// verificado, Resend solo deja enviar desde onboarding@resend.dev al correo
// con el que creaste la cuenta: suficiente para que el informe te llegue a ti.

const DEFAULT_FROM = 'Alvian Informe <onboarding@resend.dev>';

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Envía un correo. Lanza un Error con el motivo si Resend lo rechaza. */
export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Falta configurar RESEND_API_KEY en Vercel.');
  const recipients = (Array.isArray(to) ? to : String(to || '').split(','))
    .map((address) => address.trim())
    .filter(Boolean);
  if (!recipients.length) throw new Error('Falta el correo de destino (INFORME_EMAIL_TO).');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.INFORME_EMAIL_FROM || DEFAULT_FROM, to: recipients, subject, html, text }),
  });
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json()).message || '';
    } catch {
      // Sin cuerpo JSON: basta con el código.
    }
    throw new Error(`El correo no se pudo enviar (${response.status}${detail ? `: ${detail}` : ''}).`);
  }
  return recipients;
}
