'use client';

import { useState } from 'react';

export default function ProductGallery({ media, alt }) {
  const [active, setActive] = useState(0);
  const current = media[active] || media[0];

  return (
    <div className="product-gallery">
      {media.length > 1 ? (
        <div className="product-thumbs">
          {media.map((item, index) => (
            <button
              key={item.src}
              type="button"
              className={`product-thumb${index === active ? ' active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={item.type === 'video' ? 'Ver video' : `Ver foto ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.type === 'video' ? item.poster : item.src} alt="" />
              {item.type === 'video' ? <span className="product-thumb-play">▶</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="product-main-media">
        {current.type === 'video' ? (
          <video
            key={current.src}
            src={current.src}
            poster={current.poster}
            autoPlay
            muted
            loop
            playsInline
            className="product-detail-image"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt={alt} className="product-detail-image" />
        )}
      </div>
    </div>
  );
}
