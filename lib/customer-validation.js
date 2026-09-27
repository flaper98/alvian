// Reglas para los datos del cliente. Las usan los formularios (navegador) y las
// acciones del servidor, así que no importa nada del servidor.

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

// Celular peruano: 9 dígitos y empieza con 9.
export const PHONE_PATTERN = '9[0-9]{8}';
export const PHONE_HINT = 'Solo números: 9 dígitos y empieza con 9';

// DNI: 8 dígitos. Carné de extranjería: 9 a 12 dígitos.
export const DOC_PATTERN = '[0-9]{8,12}';
export const DOC_HINT = 'Solo números: DNI de 8 dígitos o CE de 9 a 12';

// Letras (con tildes y ñ), espacios, apóstrofo, punto y guion.
export const NAME_PATTERN = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .\\-]+";
export const NAME_HINT = 'Solo letras: nombre y apellido';

export function phoneError(value) {
  return new RegExp(`^${PHONE_PATTERN}$`).test(onlyDigits(value))
    ? null
    : 'El celular debe tener 9 dígitos, solo números y empezar con 9.';
}

export function docError(value, { required = false } = {}) {
  const digits = onlyDigits(value);
  if (!String(value || '').trim()) return required ? 'Ingresa tu DNI o carné de extranjería.' : null;
  if (digits !== String(value).trim() || !new RegExp(`^${DOC_PATTERN}$`).test(digits)) {
    return 'El DNI debe tener 8 dígitos (o de 9 a 12 si es carné de extranjería), solo números.';
  }
  return null;
}

export function nameError(value, { label = 'nombre' } = {}) {
  const name = String(value || '').trim();
  if (!new RegExp(`^${NAME_PATTERN}$`).test(name) || name.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').length < 3) {
    return `El ${label} solo puede tener letras.`;
  }
  if (name.split(/\s+/).filter(Boolean).length < 2) return `Escribe ${label} y apellido.`;
  return null;
}

export function emailError(value, { required = false } = {}) {
  const email = String(value || '').trim();
  if (!email) return required ? 'Ingresa tu correo.' : null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? null : 'El correo no es válido.';
}

/** Para inputs numéricos: deja solo dígitos mientras se escribe. */
export function keepDigits(event, maxLength) {
  const input = event.currentTarget;
  const clean = onlyDigits(input.value).slice(0, maxLength);
  if (clean !== input.value) input.value = clean;
}
