// Configuración de la tienda online (pagos, envíos, anuncio, datos legales).
// Se guarda como JSON en la tabla `settings` (clave "store_config") y se edita
// desde /admin/tienda. Estos son los valores por defecto hasta que se guarde algo.
// Este archivo no importa nada del servidor: lo pueden usar componentes cliente.

export const DEFAULT_STORE_CONFIG = {
  announce: {
    enabled: true,
    text: 'Entrega GRATIS en Pucallpa · Envíos a todo el Perú · Paga con Yape o Plin',
  },
  payment: {
    yapeEnabled: true,
    yapeNumber: '994 379 917',
    yapeName: 'Alvian Perfumes',
    yapeQr: '',
    transferEnabled: false,
    banks: [{ bank: 'BCP', account: '', cci: '', holder: '' }],
    cashOnDeliveryEnabled: true,
    voucherRequired: false,
    instructions:
      'Yapea o plinea el monto exacto y sube la captura de tu pago. Confirmamos tu pedido por WhatsApp en minutos (horario de atención).',
    thanks:
      '¡Gracias por tu compra! Ya recibimos tu pedido. Te escribiremos por WhatsApp para confirmar la entrega.',
  },
  shipping: {
    options: [
      {
        id: 'pucallpa',
        name: 'Delivery en Pucallpa',
        detail: 'Mismo día o al día siguiente',
        price: 0,
        local: true,
      },
      {
        id: 'provincia',
        name: 'Envío a provincia (Shalom / Olva)',
        detail: '2 a 5 días hábiles',
        price: 15,
        local: false,
      },
      {
        id: 'recojo',
        name: 'Recojo coordinado en Pucallpa',
        detail: 'Coordinamos el punto por WhatsApp',
        price: 0,
        local: true,
      },
    ],
    freeFrom: 0,
  },
  business: {
    razonSocial: '',
    ruc: '',
    address: 'Pucallpa, Ucayali, Perú',
    email: '',
    hours: 'Lun – Sáb: 9:00 – 20:00',
  },
};

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

/** Mezcla lo guardado sobre los valores por defecto (así nuevas claves nunca faltan). */
export function mergeStoreConfig(saved) {
  const out = {};
  for (const [section, defaults] of Object.entries(DEFAULT_STORE_CONFIG)) {
    const current = isPlainObject(saved?.[section]) ? saved[section] : {};
    out[section] = { ...defaults };
    for (const [key, value] of Object.entries(current)) {
      if (key in defaults && value !== undefined && value !== null) out[section][key] = value;
    }
  }
  return out;
}

export const ORDER_STATUSES = {
  pendiente: 'Por confirmar',
  pagado: 'Pago confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_FLOW = ['pendiente', 'pagado', 'preparando', 'enviado', 'entregado'];

export const PAYMENT_METHODS = {
  yape: 'Yape / Plin',
  transfer: 'Transferencia bancaria',
  contraentrega: 'Pago contra entrega',
};

export const DEPARTMENTS = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca', 'Callao', 'Cusco',
  'Huancavelica', 'Huánuco', 'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima', 'Loreto',
  'Madre de Dios', 'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
];

export function formatMoney(value) {
  const n = Number(value) || 0;
  return `S/ ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Métodos de pago disponibles para una opción de envío. */
export function availablePaymentMethods(config, shippingOption) {
  const methods = [];
  if (config.payment.yapeEnabled) methods.push('yape');
  if (config.payment.transferEnabled) methods.push('transfer');
  if (config.payment.cashOnDeliveryEnabled && shippingOption?.local) methods.push('contraentrega');
  return methods;
}

export function shippingCostFor(config, option, subtotal) {
  if (!option) return 0;
  const freeFrom = Number(config.shipping.freeFrom) || 0;
  if (freeFrom > 0 && subtotal >= freeFrom) return 0;
  return Math.max(0, Number(option.price) || 0);
}
