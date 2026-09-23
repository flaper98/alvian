import Image from 'next/image';

// Solo se optimizan con next/image las fotos propias (Vercel Blob o /public).
// Cualquier otra URL externa se muestra tal cual para no romper la página.
const OPTIMIZABLE = /^(\/(?!\/)|https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/)/i;

/** Imagen de producto que llena su contenedor (el contenedor define el tamaño). */
export default function ProductImage({ src, alt, sizes, className, preload = false }) {
  if (!src) return null;
  if (OPTIMIZABLE.test(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        preload={preload}
        loading={preload ? 'eager' : 'lazy'}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading={preload ? 'eager' : 'lazy'} />
  );
}
