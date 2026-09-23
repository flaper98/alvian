import { getStoreConfig } from '@/lib/store-db';
import SiteNav from '../SiteNav';

/**
 * Barra de anuncio (editable desde /admin/tienda) + menú de la tienda.
 * El texto del anuncio se separa por "·": en escritorio se muestra en una
 * línea; en móvil se desplaza como cinta para que no ocupe dos renglones.
 */
export default async function SiteHeader() {
  const config = await getStoreConfig();
  const { announce } = config;
  const items = String(announce.text || '')
    .split('·')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <>
      {announce.enabled && items.length ? (
        <div className="sf-announce" role="note">
          <div className="sf-announce-track">
            {[0, 1].map((copy) => (
              <p className="sf-announce-set" key={copy} aria-hidden={copy === 1 || undefined}>
                {items.map((item, i) => (
                  <span key={i}>
                    {item}
                    <i aria-hidden="true">◆</i>
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      <SiteNav />
    </>
  );
}
