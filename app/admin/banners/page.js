import { getCurrentRole } from '@/lib/session';
import { listHeroBanners } from '@/lib/db';
import BannersList from './BannersList';
import BannerFormModal from './BannerFormModal';

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let banners;
  try {
    banners = await listHeroBanners();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Banners de inicio</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Banners de inicio</h1>
        <BannerFormModal />
      </div>
      <p className="hint">
        Estas son las imágenes completas (con su propio diseño, texto y precios) que rotan en el
        carrusel de la página de inicio. Cada una debe subirse ya lista, del ancho y alto que
        quieras mostrar. Se muestran en el orden de esta lista; solo las marcadas como activas
        aparecen en la web.
      </p>
      <BannersList banners={banners} />
    </section>
  );
}
