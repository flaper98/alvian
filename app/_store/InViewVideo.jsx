'use client';

import { useEffect, useRef } from 'react';

/**
 * Video en bucle que solo se descarga cuando está por aparecer en pantalla y
 * se pausa al salir de ella (ahorra datos en celulares). Si el usuario pide
 * menos movimiento, se queda en la imagen de portada.
 */
export default function InViewVideo({ src, poster, label, className = 'sf-video' }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.getAttribute('src')) video.setAttribute('src', src);
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.15 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster || undefined}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label ? `Video del perfume ${label}` : undefined}
    />
  );
}
