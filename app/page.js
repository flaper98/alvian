import { listPerfumes } from '@/lib/db';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import PerfumeCard from './PerfumeCard';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import WhatsAppIcon from './WhatsAppIcon';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let perfumes = [];
  try {
    const allPerfumes = await listPerfumes();
    // Un producto recién creado empieza sin precio (se define al registrar la
    // primera compra), así que no se muestra en la tienda hasta tener precio.
    perfumes = allPerfumes.filter((perfume) => Number(perfume.price) > 0);
  } catch (error) {
    perfumes = [];
  }

  return (
    <>
      <header className="hero">
        <div className="hero-content">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Alvian" className="hero-logo" />
          <p className="eyebrow">Perfumería</p>
          <h1>Alvian</h1>
          <p className="hero-subtitle">
            Fragancias originales seleccionadas para ti. Escríbenos por WhatsApp y te
            ayudamos a elegir tu perfume ideal.
          </p>
          <a
            className="btn-whatsapp"
            href={buildWhatsAppLink('Hola, quiero información sobre sus perfumes.')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon width={19} height={19} />
            Escríbenos por WhatsApp
          </a>
        </div>
      </header>

      <main className="catalog">
        <h2 className="catalog-title">Nuestros perfumes</h2>
        {perfumes.length === 0 ? (
          <p className="empty-state">Muy pronto nuevos perfumes. ¡Vuelve pronto!</p>
        ) : (
          <div className="catalog-grid">
            {perfumes.map((perfume) => (
              <PerfumeCard key={perfume.id} perfume={perfume} />
            ))}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Alvian Perfumes</p>
      </footer>

      <WhatsAppFloatingButton />
    </>
  );
}
