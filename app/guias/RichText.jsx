import Link from 'next/link';

/** Texto con [enlaces](/ruta) y **negritas** (el formato de lib/guides.js). */
export default function RichText({ text }) {
  const token = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = token.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = match.index;
    if (match[1]) {
      const href = match[2];
      parts.push(
        href.startsWith('/') ? (
          <Link key={key} href={href}>
            {match[1]}
          </Link>
        ) : (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {match[1]}
          </a>
        ),
      );
    } else {
      parts.push(<strong key={key}>{match[3]}</strong>);
    }
    last = token.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Texto plano (sin marcas) para metadatos y datos estructurados. */
export function plainText(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}
