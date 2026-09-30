import Link from 'next/link';
import ProductImage from './ProductImage';
import { IconArrow } from './icons';

/**
 * Tarjetas grandes "Para él / Para ella / Unisex". Llevan a la página de cada
 * categoría (/perfumes/hombre…), que Google puede indexar por separado.
 */
export default function CategoryCards({ categories }) {
  if (!categories?.length) return null;

  return (
    <div className={`sf-cats sf-cats-${categories.length}`}>
      {categories.map((cat) => (
        <Link key={cat.value} href={`/perfumes/${cat.value}`} className="sf-cat reveal">
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
        </Link>
      ))}
    </div>
  );
}
