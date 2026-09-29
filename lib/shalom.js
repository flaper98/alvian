// Seguimiento de envíos por Shalom. El estado se actualiza a mano: el rastreo
// oficial de Shalom pide iniciar sesión y pasar un reCAPTCHA, así que el
// sistema no puede consultarlo solo. Cada envío guarda su N° de orden y su
// código para abrir el rastreo oficial con un clic.

export const SHALOM_TRACK_URL = 'https://shalom.com.pe/rastrea';

export const SHIPMENT_DIRECTIONS = {
  saliente: 'Envío a cliente',
  entrante: 'Recibo de proveedor',
};

export const SHIPMENT_STATUSES = {
  registrado: 'Registrado',
  en_origen: 'En agencia de origen',
  en_transito: 'En tránsito',
  en_destino: 'En agencia de destino',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  observado: 'Con incidencia',
};

// Estados en los que el envío ya no necesita atención.
export const SHIPMENT_CLOSED = ['entregado'];

/** N° de orden: solo dígitos (Shalom usa 8 a 10). */
export function normalizeOrderNumber(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Código de orden: letras y números en mayúscula (Shalom usa 4). */
export function normalizeOrderCode(value) {
  return String(value || '')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
}
