import Link from 'next/link';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import WhatsAppIcon from '../WhatsAppIcon';
import ProductImage from './ProductImage';
import InViewVideo from './InViewVideo';
import {
  IconTruck,
  IconShield,
  IconChat,
  IconLock,
  IconStar,
  IconPlus,
  IconArrow,
  IconBag,
  IconCheck,
  IconGift,
  IconClock,
} from './icons';

/* ------------------------------------------------------------------ */
/* Confianza                                                           */
/* ------------------------------------------------------------------ */

const TRUST = [
  { icon: IconShield, title: '100% originales', text: 'Sellados, de distribuidor' },
  { icon: IconTruck, title: 'Entrega gratis en Pucallpa', text: 'Mismo día o al siguiente' },
  { icon: IconBag, title: 'Envíos a todo el Perú', text: 'Shalom u Olva, 2 a 5 días' },
  { icon: IconLock, title: 'Paga con Yape o Plin', text: 'O contra entrega en Pucallpa' },
];

/** Píldoras cortas (se usan sobre fondos oscuros, p. ej. el hero). */
export function TrustBadges() {
  return (
    <ul className="sf-pills">
      <li>
        <IconShield size={16} /> 100% originales
      </li>
      <li>
        <IconTruck size={16} /> Envíos a todo el Perú
      </li>
      <li>
        <IconLock size={16} /> Paga con Yape o Plin
      </li>
    </ul>
  );
}

/** Franja de garantías debajo del hero. */
export function TrustBar() {
  return (
    <section className="sf-trust" aria-label="Por qué comprar en Alvian">
      <ul className="sf-wrap sf-trust-list">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="sf-trust-ic">
              <Icon size={22} />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Encabezado de sección                                               */
/* ------------------------------------------------------------------ */

export function SectionHead({ eyebrow, title, text, align = 'center', children }) {
  return (
    <div className={`sf-head sf-head-${align} reveal`}>
      <div className="sf-head-text">
        {eyebrow ? <p className="sf-eyebrow">{eyebrow}</p> : null}
        <h2 className="sf-h2">{title}</h2>
        {text ? <p className="sf-lead">{text}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frase gigante (texto con textura esmeralda y oro)                   */
/* ------------------------------------------------------------------ */

export function Statement() {
  return (
    <section className="sf-statement" aria-label="Tu esencia, sin límites">
      <p className="sf-statement-text reveal" aria-hidden="true">
        <span>Tu esencia</span>
        <span>sin límites</span>
      </p>
      <p className="sf-statement-sub sf-wrap reveal">
        Perfumes árabes originales, elegidos uno a uno para acompañarte todo el día.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Bloque dividido: video/imagen + beneficios                          */
/* ------------------------------------------------------------------ */

const WHY = [
  'Originales y sellados: Lattafa, Armaf, Rasasi y Afnan',
  'Fragancias intensas de 8 a 12 horas en piel',
  'Te asesoramos gratis por WhatsApp antes de comprar',
  'Paga con Yape, Plin o contra entrega en Pucallpa',
];

export function WhyAlvian({ perfume }) {
  const wa = buildWhatsAppLink(
    'Hola, vengo desde su página web. ¿Me ayudan a elegir un perfume según mis gustos?',
  );
  return (
    <section className="sf-section">
      <div className="sf-wrap sf-split">
        <div className="sf-split-media reveal">
          {perfume?.video_url ? (
            <InViewVideo src={perfume.video_url} label={perfume.name} />
          ) : perfume?.image_url ? (
            <ProductImage
              src={perfume.image_url}
              alt={`Perfume ${perfume.name}`}
              sizes="(max-width: 900px) 100vw, 560px"
              className="sf-split-img"
            />
          ) : null}
          {perfume ? (
            <Link href={`/perfume/${perfume.slug}`} className="sf-split-tag">
              {perfume.name} <IconArrow size={14} />
            </Link>
          ) : null}
        </div>
        <div className="sf-split-copy reveal">
          <p className="sf-eyebrow">Por qué Alvian</p>
          <h2 className="sf-h2 sf-h2-xl">
            Lujo árabe original, <em>sin sorpresas.</em>
          </h2>
          <ul className="sf-checks">
            {WHY.map((item) => (
              <li key={item}>
                <span>
                  <IconCheck size={14} />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="sf-actions">
            <Link href="/#catalogo" className="sf-btn sf-btn-dark sf-btn-lg">
              Ver fragancias <IconArrow size={18} />
            </Link>
            <a className="sf-btn sf-btn-ghost sf-btn-lg" href={wa} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={18} height={18} /> Asesoría gratis
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cómo comprar                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: IconBag,
    title: 'Elige tu fragancia',
    text: 'Explora el catálogo, mira el detalle de cada perfume y agrégalo a tu carrito.',
  },
  {
    icon: IconLock,
    title: 'Confirma y paga',
    text: 'Indica dónde lo entregamos y paga con Yape, Plin o contra entrega en Pucallpa.',
  },
  {
    icon: IconTruck,
    title: 'Recíbelo en casa',
    text: 'En Pucallpa llega el mismo día o al siguiente. A provincias en 2 a 5 días hábiles.',
  },
];

export function HowToBuy({ compact = false }) {
  return (
    <section className={`sf-section sf-section-soft${compact ? ' compact' : ''}`} id="como-comprar">
      <div className="sf-wrap">
        <SectionHead
          eyebrow="Cómo comprar"
          title="Tu perfume en 3 pasos"
          text={compact ? null : 'Rápido, seguro y sin complicaciones. La mayoría de pedidos se confirma en minutos.'}
        />
        <ol className="sf-steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li className="sf-step reveal" key={title}>
              <div className="sf-step-art" aria-hidden="true">
                <span className="sf-step-num">{i + 1}</span>
                <Icon size={44} />
              </div>
              <div className="sf-step-body">
                <span className="sf-step-pill">Paso {i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Opiniones (se cargan desde /admin/tienda)                           */
/* ------------------------------------------------------------------ */

export function Testimonials({ reviews }) {
  if (!reviews?.length) return null;
  const avg = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length;
  return (
    <section className="sf-section">
      <div className="sf-wrap">
        <SectionHead eyebrow="Clientes felices" title="Lo que dicen de nosotros">
          <p className="sf-rating">
            <span className="sf-stars" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <IconStar key={i} size={16} />
              ))}
            </span>
            {avg.toFixed(1)} de 5 · {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}
          </p>
        </SectionHead>
        <div className="sf-reviews">
          {reviews.map((review) => (
            <figure className="sf-review reveal" key={review.id}>
              <div className="sf-stars" aria-label={`${review.rating} de 5 estrellas`}>
                {Array.from({ length: Math.max(1, Math.min(5, review.rating)) }, (_, i) => (
                  <IconStar key={i} size={15} />
                ))}
              </div>
              <blockquote>“{review.text}”</blockquote>
              <figcaption>
                <span className="sf-avatar" aria-hidden="true">
                  {String(review.name || '?').trim().charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{review.name}</strong>
                  {review.city ? <small>{review.city}</small> : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Regalo                                                              */
/* ------------------------------------------------------------------ */

export function GiftSection({ perfume }) {
  const wa = buildWhatsAppLink(
    'Hola, vengo desde su página web. Quiero regalar un perfume, ¿me ayudan a elegir?',
  );
  return (
    <section className="sf-section">
      <div className="sf-wrap sf-gift">
        <div className="sf-gift-media reveal">
          {perfume?.image_url ? (
            <ProductImage
              src={perfume.image_url}
              alt={`Perfume ${perfume.name} para regalo`}
              sizes="(max-width: 900px) 90vw, 480px"
              className="sf-gift-img"
            />
          ) : null}
          <span className="sf-gift-ribbon" aria-hidden="true">
            <IconGift size={22} />
          </span>
        </div>
        <div className="sf-gift-copy reveal">
          <p className="sf-eyebrow">Regalos</p>
          <h2 className="sf-h2 sf-h2-xl">
            Un regalo que <em>sí</em> van a usar.
          </h2>
          <p className="sf-lead">
            Cumpleaños, aniversario o solo porque sí. Un perfume se usa todos los días y se recuerda
            siempre. Cuéntanos para quién es y te ayudamos a elegir el indicado.
          </p>
          <ul className="sf-mini-list">
            <li>
              <IconClock size={16} /> Entrega el mismo día en Pucallpa
            </li>
            <li>
              <IconChat size={16} /> Te recomendamos según sus gustos
            </li>
          </ul>
          <div className="sf-actions">
            <a className="sf-btn sf-btn-dark sf-btn-lg" href={wa} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon width={18} height={18} /> Elegir un regalo
            </a>
            <Link href="/#catalogo" className="sf-btn sf-btn-ghost sf-btn-lg">
              Ver perfumes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Preguntas frecuentes                                                */
/* ------------------------------------------------------------------ */

export function FaqSection({ faqs, title = 'Preguntas frecuentes' }) {
  if (!faqs?.length) return null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  return (
    <section className="sf-section sf-section-soft" id="preguntas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="sf-wrap sf-faq-layout">
        <div className="sf-faq-intro reveal">
          <p className="sf-eyebrow">Ayuda</p>
          <h2 className="sf-h2">{title}</h2>
          <p className="sf-lead">¿No encuentras tu respuesta? Escríbenos y te respondemos al toque.</p>
          <a
            className="sf-btn sf-btn-ghost"
            href={buildWhatsAppLink('Hola, vengo desde su página web. Tengo una consulta.')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsAppIcon width={18} height={18} /> Escríbenos por WhatsApp
          </a>
        </div>
        <div className="sf-faq">
          {faqs.map((faq) => (
            <details key={faq.id}>
              <summary>
                {faq.question}
                <span className="sf-faq-plus" aria-hidden="true">
                  <IconPlus size={18} />
                </span>
              </summary>
              <div className="sf-faq-a">
                {String(faq.answer)
                  .split(/\n+/)
                  .map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
