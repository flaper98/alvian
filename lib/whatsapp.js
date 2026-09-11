// Número de WhatsApp del negocio, en formato internacional sin "+" ni espacios.
// 51 = Perú. Si el número no es peruano, cambia el prefijo "51" por el que corresponda.
export const WHATSAPP_NUMBER = '51994379917';

export function buildWhatsAppLink(message) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}
