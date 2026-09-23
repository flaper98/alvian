import Link from 'next/link';
import { formatMoney } from '@/lib/store-config';
import InViewVideo from './InViewVideo';
import { SectionHead } from './sections';
import { IconArrow } from './icons';

/** Tira de videos verticales (tipo reels) de los perfumes que tienen video. */
export default function Reels({ perfumes }) {
  if (!perfumes || perfumes.length < 2) return null;
  return (
    <section className="sf-section sf-reels-section">
      <div className="sf-wrap">
        <SectionHead
          eyebrow="Míralos de cerca"
          title="Fragancias que se sienten con la vista"
          text="Toca cualquiera para ver su detalle, precio y disponibilidad."
        />
      </div>
      <div className="sf-reels" role="list">
        {perfumes.map((perfume) => (
          <Link
            role="listitem"
            key={perfume.id}
            href={`/perfume/${perfume.slug}`}
            className="sf-reel reveal"
          >
            <InViewVideo src={perfume.video_url} label={perfume.name} />
            <span className="sf-reel-info">
              <strong>{perfume.name}</strong>
              <span>
                {formatMoney(perfume.price)} <IconArrow size={14} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
