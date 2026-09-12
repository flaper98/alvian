'use client';

import { useEffect, useRef, useState } from 'react';
import PerfumeCard from './PerfumeCard';

function ChevronIcon({ direction }) {
  const d = direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PerfumeCarousel({ perfumes }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    function updateArrows() {
      setCanPrev(track.scrollLeft > 8);
      setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
    }

    updateArrows();
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      track.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [perfumes]);

  function scrollByDirection(direction) {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector('.carousel-item');
    const step = item ? item.getBoundingClientRect().width + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  return (
    <div className="perfume-carousel">
      <button
        type="button"
        className="carousel-arrow carousel-arrow-prev"
        onClick={() => scrollByDirection(-1)}
        disabled={!canPrev}
        aria-label="Anterior"
      >
        <ChevronIcon direction="left" />
      </button>

      <div className="carousel-track" ref={trackRef}>
        {perfumes.map((perfume) => (
          <div className="carousel-item" key={perfume.id}>
            <PerfumeCard perfume={perfume} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="carousel-arrow carousel-arrow-next"
        onClick={() => scrollByDirection(1)}
        disabled={!canNext}
        aria-label="Siguiente"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}
