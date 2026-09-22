'use client';

import { useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 30;
const AXIS_LOCK_PX = 8;

export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const hiddenRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const slideRefs = useRef([]);
  const touchRef = useRef({ startX: 0, startY: 0, dx: 0, axis: null });

  // No autoplay en absoluto si el usuario prefiere menos movimiento.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = query.matches;
    const onChange = (event) => {
      reducedMotionRef.current = event.matches;
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Pausa el autoplay si la pestaña no está visible (evita saltos de varias
  // diapositivas de golpe cuando el usuario vuelve a la pestaña).
  useEffect(() => {
    function onVisibilityChange() {
      hiddenRef.current = document.hidden;
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      if (hoveredRef.current || focusedRef.current || hiddenRef.current || reducedMotionRef.current) {
        return;
      }
      setIndex((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);
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

  // El gesto sigue el dedo en vivo (transform directo, sin re-render) y solo
  // "gana" el gesto horizontal si el movimiento es más horizontal que
  // vertical, para no interferir con el scroll de la página. La diapositiva
  // activa es la única visible, así que basta con moverla a ella.
  function handleTouchStart(event) {
    const touch = event.touches[0];
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, dx: 0, axis: null };
  }

  function handleTouchMove(event) {
    const touch = event.touches[0];
    const state = touchRef.current;
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (!state.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    state.dx = dx;
    const el = slideRefs.current[index];
    if (el) el.style.transform = `translateX(${dx}px)`;
  }

  function handleTouchEnd() {
    const state = touchRef.current;
    const el = slideRefs.current[index];
    if (el) {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = '';
      const node = el;
      setTimeout(() => {
        node.style.transition = '';
      }, 200);
    }
    if (state.axis === 'x' && Math.abs(state.dx) >= SWIPE_THRESHOLD_PX) {
      if (state.dx < 0) next();
      else prev();
    }
    touchRef.current = { startX: 0, startY: 0, dx: 0, axis: null };
  }

  const currentSlide = slides[index];

  return (
    <div
      className="hero-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promociones destacadas"
      onMouseEnter={() => {
        hoveredRef.current = true;
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
      }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focusedRef.current = false;
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <p className="sr-only" aria-live="polite">
        Diapositiva {index + 1} de {slides.length}: {currentSlide?.alt_text}
      </p>

      {slides.map((slide, i) => {
        const image = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image_url} alt={slide.alt_text} className="hero-banner-image" />
        );
        return (
          <div
            key={slide.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className={`hero-slide${i === index ? ' active' : ''}`}
            aria-hidden={i !== index}
          >
            <div
              className="hero-banner-backdrop"
              style={{ backgroundImage: `url(${slide.image_url})` }}
              aria-hidden="true"
            />
            {slide.link_url ? (
              <a href={slide.link_url} className="hero-banner-link" tabIndex={i === index ? 0 : -1}>
                {image}
              </a>
            ) : (
              image
            )}
          </div>
        );
      })}

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
                aria-label={`Ir a la diapositiva ${i + 1} de ${slides.length}: ${slide.alt_text}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
