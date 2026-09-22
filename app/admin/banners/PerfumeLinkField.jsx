'use client';

import { useState } from 'react';

export const CATALOG_LINK_VALUE = '__catalogo__';

export default function PerfumeLinkField({ perfumes, initialSelection, initialCustomLink }) {
  const [selection, setSelection] = useState(initialSelection || '');
  const [customLink, setCustomLink] = useState(initialCustomLink || '');

  return (
    <>
      <label>
        Perfume al que apunta (opcional)
        <select
          name="perfumeSelection"
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
        >
          <option value="">— Sin elegir —</option>
          <option value={CATALOG_LINK_VALUE}>Ver todo el catálogo</option>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.name}>
              {perfume.name}
            </option>
          ))}
        </select>
        <span className="hint">Elige un perfume y el enlace se arma solo — no hace falta escribirlo.</span>
      </label>
      <label>
        O enlace personalizado (opcional)
        <input
          name="linkUrl"
          type="text"
          placeholder="Ej: https://... o una ruta"
          value={customLink}
          onChange={(event) => setCustomLink(event.target.value)}
          disabled={Boolean(selection)}
        />
        <span className="hint">
          {selection
            ? 'No se usa: ya elegiste un perfume arriba.'
            : 'Si dejas todo vacío, el banner no será clicable.'}
        </span>
      </label>
    </>
  );
}
