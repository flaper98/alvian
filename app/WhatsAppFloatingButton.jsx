import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppIcon from './WhatsAppIcon';

export default function WhatsAppFloatingButton() {
  return (
    <a
      className="whatsapp-fab"
      href={buildWhatsAppLink('Hola, quiero información sobre sus perfumes.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
    >
      <WhatsAppIcon width={26} height={26} />
    </a>
  );
}
