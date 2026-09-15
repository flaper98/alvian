'use client';

import { useEffect, useRef, useState } from 'react';
import WhatsAppIcon from './WhatsAppIcon';

export default function HeroCarousel({ slides, whatsappHref }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setIndex((current) => (current + 1) % slides.length);
      }
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  function goTo(i) {
    setIndex(i);
  }

  function prev() {
    setIndex((current) => (current - 1 + slides.length) % slides.length);
  }

  function next() {
    setIndex((current) => (current + 1) % slides.length);
  }

  return (
    <div
      className="hero-carousel"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {slides.map((slide, i) => (
        <div key={slide.id} className={`hero-slide${i === index ? ' active' : ''}`} aria-hidden={i !== index}>
          <div className="hero-slide-content">
            <p className="eyebrow">Perfumería en Pucallpa</p>
            <h1>{slide.name}</h1>
            <p className="hero-slide-subtitle">
              {slide.description || 'Fragancia original disponible ahora'}
            </p>
            <div className="hero-actions">
              <a
                className="btn-whatsapp"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon width={19} height={19} />
                Escríbenos por WhatsApp
              </a>
              <a href="#catalogo" className="btn-hero-outline">
                Ver catálogo
              </a>
            </div>
          </div>
          <div className="hero-slide-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image_url} alt="" className="hero-slide-image" />
          </div>
        </div>
      ))}

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="hero-carousel-arrow hero-carousel-arrow-prev"
            onClick={prev}
            aria-label="Diapositiva anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-carousel-arrow hero-carousel-arrow-next"
            onClick={next}
            aria-label="Siguiente diapositiva"
          >
            ›
          </button>
          <div className="hero-carousel-dots">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={`hero-carousel-dot${i === index ? ' active' : ''}`}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
