'use client';

import { useMemo, useState } from 'react';

const CATEGORIES = [
  ['hombre', 'Hombre'],
  ['mujer', 'Mujer'],
  ['unisex', 'Unisex'],
  ['', 'Otros'],
];

// Precio redondo sin céntimos si no los tiene: "S/ 169", "S/ 155.50".
const price = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', {
    minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const phoneLabel = (number) => {
  const local = String(number).replace(/^51/, '');
  return `+51 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
};

function groupItems(items, byCategory) {
  if (!byCategory) return [{ key: 'all', label: null, items }];
  return CATEGORIES.map(([key, label]) => ({
    key: key || 'otros',
    label,
    items: items.filter((i) => (key ? i.category === key : !CATEGORIES.some(([k]) => k && k === i.category))),
  })).filter((g) => g.items.length > 0);
}

/** Texto listo para pegar en WhatsApp (con *negritas* y viñetas). */
function whatsappText(groups, { today, site, whatsapp, showLast }) {
  const lines = [`*Perfumes disponibles · Alvian Fragancias*`, `_Actualizado al ${today}_`, ''];
  for (const g of groups) {
    if (g.label) lines.push(`*${g.label}*`);
    for (const i of g.items) {
      const offer = i.comparePrice ? ` ~${price(i.comparePrice)}~` : '';
      lines.push(`• ${i.name} — ${price(i.price)}${offer}${showLast && i.last ? ' _(últimas unidades)_' : ''}`);
    }
    lines.push('');
  }
  lines.push('Envíos a todo el Perú · Paga con Yape o Plin');
  lines.push(`Pedidos: wa.me/${whatsapp}`);
  lines.push(`Catálogo: ${site}`);
  return lines.join('\n');
}

export default function StockPoster({ items, today, site, whatsapp }) {
  const [photos, setPhotos] = useState(true);
  const [byCategory, setByCategory] = useState(true);
  const [showLast, setShowLast] = useState(true);
  const [hidden, setHidden] = useState(() => new Set());
  const [copied, setCopied] = useState(false);

  const visible = useMemo(() => items.filter((i) => !hidden.has(i.id)), [items, hidden]);
  const groups = useMemo(() => groupItems(visible, byCategory), [visible, byCategory]);

  const toggleHidden = (id) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function copyText() {
    const text = whatsappText(groups, { today, site, whatsapp, showLast });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Sin permiso de portapapeles: se selecciona en un cuadro para copiar a mano.
      window.prompt('Copia este texto:', text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (items.length === 0) {
    return <p className="hint">No tienes perfumes con stock y precio en este momento.</p>;
  }

  return (
    <div className="poster-layout">
      <aside className="poster-controls no-print">
        <div className="dist-card">
          <h3 className="dist-card-title">Cómo se ve</h3>
          <label className="checkbox-field">
            <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} />
            Con fotos
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={byCategory} onChange={(e) => setByCategory(e.target.checked)} />
            Separar Hombre / Mujer / Unisex
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={showLast} onChange={(e) => setShowLast(e.target.checked)} />
            Marcar «Últimas unidades» (quedan 1 o 2)
          </label>
          <button type="button" className="btn-primary poster-copy" onClick={copyText}>
            {copied ? '¡Copiado! Pégalo en WhatsApp' : 'Copiar texto para WhatsApp'}
          </button>
          <p className="hint">
            Para la captura: en el celular abre esta pantalla y captura la tarjeta. Si es larga, desmarca «Con fotos».
          </p>
        </div>
        <details className="dist-card poster-hide">
          <summary>Quitar perfumes de la lista ({hidden.size} quitados)</summary>
          <ul>
            {items.map((i) => (
              <li key={i.id}>
                <label className="checkbox-field">
                  <input type="checkbox" checked={!hidden.has(i.id)} onChange={() => toggleHidden(i.id)} />
                  {i.name}
                </label>
              </li>
            ))}
          </ul>
        </details>
      </aside>

      <article className={`poster${photos ? ' with-photos' : ''}`} aria-label="Lista de perfumes disponibles">
        <header className="poster-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" width={56} height={56} />
          <div>
            <span className="poster-brand">Alvian Fragancias</span>
            <strong>Perfumes disponibles</strong>
            <small>Actualizado al {today}</small>
          </div>
        </header>

        {groups.map((g) => (
          <section key={g.key} className="poster-group">
            {g.label ? (
              <h4>
                {g.label} <span>{g.items.length}</span>
              </h4>
            ) : null}
            <ul className={photos ? 'poster-grid' : 'poster-list'}>
              {g.items.map((i) => (
                <li key={i.id}>
                  {photos ? (
                    i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" loading="lazy" />
                    ) : (
                      <span className="poster-noimg" aria-hidden="true" />
                    )
                  ) : null}
                  <span className="poster-name">
                    {i.name}
                    {showLast && i.last ? <em>Últimas unidades</em> : null}
                  </span>
                  <span className="poster-price">
                    {i.comparePrice ? <s>{price(i.comparePrice)}</s> : null}
                    <strong>{price(i.price)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className="poster-foot">
          <span>Envíos a todo el Perú · Paga con Yape o Plin</span>
          <strong>
            WhatsApp {phoneLabel(whatsapp)} · {site}
          </strong>
        </footer>
      </article>
    </div>
  );
}
