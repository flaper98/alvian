'use client';

import ProductImage from './ProductImage';
import { IconArrow } from './icons';
import { CATEGORY_EVENT } from '../PerfumeCatalog';

/**
 * Tarjetas grandes "Para él / Para ella / Unisex". Al tocarlas filtran el
 * catálogo y bajan hasta él (sin recargar la página).
 */
export default function CategoryCards({ categories }) {
  if (!categories?.length) return null;

  function pick(event, value) {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent(CATEGORY_EVENT, { detail: value }));
    const url = new URL(window.location.href);
    url.searchParams.set('categoria', value);
    url.hash = 'catalogo';
    window.history.replaceState(null, '', url);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className={`sf-cats sf-cats-${categories.length}`}>
      {categories.map((cat) => (
        <a
          key={cat.value}
          href={`/?categoria=${cat.value}#catalogo`}
          className="sf-cat reveal"
          onClick={(event) => pick(event, cat.value)}
        >
          <span className="sf-cat-media">
            {cat.image ? (
              <ProductImage
                src={cat.image}
                alt=""
                sizes="(max-width: 700px) 90vw, 400px"
                className="sf-cat-img"
              />
            ) : null}
            <span className="sf-cat-count">
              {cat.count} {cat.count === 1 ? 'fragancia' : 'fragancias'}
            </span>
          </span>
          <span className="sf-cat-body">
            <span className="sf-eyebrow">{cat.eyebrow}</span>
            <strong className="sf-cat-title">{cat.title}</strong>
            <span className="sf-cat-text">{cat.text}</span>
            <span className="sf-cat-link">
              Ver fragancias <IconArrow size={16} />
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
