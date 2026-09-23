import { getStoreConfig } from '@/lib/store-db';
import SiteHeader from '../_store/SiteHeader';
import SiteFooter from '../SiteFooter';
import ComplaintForm from './ComplaintForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Libro de Reclamaciones',
  description: 'Libro de Reclamaciones virtual de Alvian Perfumes, conforme al Código de Protección y Defensa del Consumidor.',
  alternates: { canonical: '/reclamaciones' },
};

export default async function ReclamacionesPage() {
  const { business } = await getStoreConfig();
  const today = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima' }).format(new Date());
  return (
    <>
      <SiteHeader />
      <section className="store-section">
        <div className="wrap narrow">
          <div className="section-head">
            <p className="eyebrow">Libro de Reclamaciones virtual</p>
            <h1 className="h2">Hoja de reclamación</h1>
            <p className="muted">
              {business.razonSocial || 'Alvian Perfumes'}
              {business.ruc ? ` · RUC ${business.ruc}` : ''} · {business.address} · Fecha: {today}
            </p>
          </div>
          <ComplaintForm />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
