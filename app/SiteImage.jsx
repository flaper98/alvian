import Image from 'next/image';

const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

// Solo se optimizan (compresión, WebP/AVIF, tamaños responsivos) las imágenes
// locales y las del Blob de Vercel. Cualquier otra URL externa se muestra tal
// cual, para no romper fotos pegadas a mano desde otros sitios.
export function isOptimizable(src) {
  if (typeof src !== 'string') return false;
  // Una ruta local con "?..." haría fallar el componente de imagen de Next.
  if (src.startsWith('/')) return !src.startsWith('//') && !src.includes('?');
  return BLOB_HOST.test(src);
}

// URL ya optimizada de un ancho fijo (para fondos CSS, donde no se puede usar
// el componente de imagen). Si la URL no es optimizable, se devuelve igual.
export function optimizedUrl(src, width) {
  if (!isOptimizable(src)) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

const FILL_STYLE = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

export default function SiteImage({ src, alt, fill, width, height, sizes, preload, className }) {
  if (!isOptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={preload ? 'eager' : 'lazy'}
        style={fill ? FILL_STYLE : undefined}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      sizes={sizes}
      preload={preload}
      {...(fill ? { fill: true } : { width, height })}
    />
  );
}
