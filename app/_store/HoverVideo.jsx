'use client';

import { useEffect, useRef } from 'react';

/**
 * Video del perfume que aparece al pasar el mouse por la tarjeta (solo en
 * equipos con mouse). No descarga nada hasta el primer hover, así el
 * catálogo carga rápido incluso con muchos videos.
 */
export default function HoverVideo({ src, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    const card = video?.closest('[data-hover-video]');
    if (!video || !card) return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const play = () => {
      if (!video.src) video.src = src;
      card.classList.add('is-playing');
      video.play().catch(() => {});
    };
    const stop = () => {
      card.classList.remove('is-playing');
      video.pause();
    };
    card.addEventListener('mouseenter', play);
    card.addEventListener('mouseleave', stop);
    return () => {
      card.removeEventListener('mouseenter', play);
      card.removeEventListener('mouseleave', stop);
    };
  }, [src]);

  return <video ref={ref} className={className} muted loop playsInline preload="none" aria-hidden="true" />;
}
