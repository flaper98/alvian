import { getCurrentRole } from '@/lib/session';
import { getStoreConfig, listFaqs, listTestimonials } from '@/lib/store-db';
import StoreSettingsForm from './StoreSettingsForm';
import { FaqManager, TestimonialManager } from './ContentManagers';

export const dynamic = 'force-dynamic';

export default async function TiendaPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }
  const [config, faqs, testimonials] = await Promise.all([
    getStoreConfig(),
    listFaqs(),
    listTestimonials(),
  ]);

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Tienda online</h1>
      </div>
      <p className="hint">
        Todo lo que ve el cliente al comprar desde la web: pagos, envíos, barra de anuncio,
        preguntas frecuentes y opiniones. Los cambios se ven en la tienda al instante.
      </p>
      <StoreSettingsForm config={config} />
      <FaqManager faqs={faqs} />
      <TestimonialManager testimonials={testimonials} />
    </section>
  );
}
