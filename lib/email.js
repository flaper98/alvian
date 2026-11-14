// Envío de correos con Resend (https://resend.com), por su API HTTP.
// Variables: RESEND_API_KEY y, opcional, INFORME_EMAIL_FROM. Sin dominio
// verificado, Resend solo deja enviar desde onboarding@resend.dev al correo
// con el que creaste la cuenta: suficiente para que el informe te llegue a ti.

const DEFAULT_FROM = 'Alvian Informe <onboarding@resend.dev>';

// Al copiar la clave en Vercel es fácil arrastrar espacios, comillas o "Bearer".
const resendKey = () =>
  String(process.env.RESEND_API_KEY || '')
    .trim()
    .replace(/^bearer\s+/i, '')
    .replace(/^["']|["']$/g, '');

export function emailConfigured() {
  return Boolean(resendKey());
}

/**
 * Cómo luce la clave guardada, sin mostrarla: para el diagnóstico del panel.
 * Una clave de Resend empieza con "re_" y no tiene espacios.
 */
export function resendKeyStatus() {
  const raw = String(process.env.RESEND_API_KEY || '');
  const key = resendKey();
  return {
    present: Boolean(key),
    length: key.length,
    startsOk: key.startsWith('re_'),
    // Espacios, saltos de línea, comillas o "Bearer" al copiarla (el envío ya los quita).
    hadExtra: raw !== key,
    innerSpace: /\s/.test(key),
  };
}

const EMAIL = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[a-z]{2,}$/i;

/**
 * Los correos de destino, aceptando lo que se suele pegar: separados por coma,
 * punto y coma o espacio, con comillas, "mailto:" o en la forma "Nombre <correo>".
 */
export function parseRecipients(value) {
  const valid = [];
  const invalid = [];
  // NFKC convierte "＠" (teclados asiáticos o copiado de otra app) en "@"; los
  // caracteres de ancho cero se cuelan al copiar y no se ven.
  const clean = String(value || '')
    .normalize('NFKC')
    .replace(/[​-‍⁠﻿]/g, '');
  for (const part of clean.split(/[,;\s]+/)) {
    const address = part
      .trim()
      .replace(/^mailto:/i, '')
      .replace(/^[<"'(]+|[>"')]+$/g, '')
      .toLowerCase();
    if (!address) continue;
    if (EMAIL.test(address)) {
      if (!valid.includes(address)) valid.push(address);
    } else if (address.includes('@')) {
      invalid.push(address);
    }
  }
  return { valid, invalid };
}

/**
 * A quién se enviará el informe, para el diagnóstico del panel. `stored`
 * muestra lo guardado con los caracteres invisibles a la vista (​…),
 * salvo que parezca una clave (no se muestra).
 */
export function recipientStatus() {
  const raw = String(process.env.INFORME_EMAIL_TO || '');
  const looksLikeKey = /^\s*(re_|sk-)/i.test(raw);
  return {
    ...parseRecipients(raw),
    stored: looksLikeKey ? null : JSON.stringify(raw).slice(1, -1),
    looksLikeKey,
  };
}

/** Envía un correo. Lanza un Error con el motivo si Resend lo rechaza. */
export async function sendEmail({ to, subject, html, text }) {
  const key = resendKey();
  if (!key) throw new Error('Falta configurar RESEND_API_KEY en Vercel.');
  const recipients = parseRecipients(Array.isArray(to) ? to.join(',') : to).valid;
  if (!recipients.length) {
    throw new Error('INFORME_EMAIL_TO no tiene un correo válido: pon solo tu correo, por ejemplo nombre@gmail.com.');
  }

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
    if (/api key/i.test(detail) || response.status === 401) {
      throw new Error(
        'La clave de Resend no es válida. En resend.com → API Keys crea una nueva (empieza con «re_»), pégala en Vercel como RESEND_API_KEY sin espacios ni comillas y vuelve a publicar.',
      );
    }
    if (/testing emails|verify a domain|own email/i.test(detail)) {
      throw new Error(
        'Sin dominio verificado, Resend solo envía al correo con el que creaste la cuenta: pon ese correo en INFORME_EMAIL_TO.',
      );
    }
    throw new Error(`El correo no se pudo enviar (${response.status}${detail ? `: ${detail}` : ''}).`);
  }
  return recipients;
}
