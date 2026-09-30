import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Imagen de 1200 × 630 que muestran WhatsApp, Facebook y Google al compartir
// la tienda. Se genera una sola vez en el build y queda en caché.
export const dynamic = 'force-static';

export async function GET() {
  const logo = await readFile(join(process.cwd(), 'public/logo.jpg'));
  const logoSrc = `data:image/jpeg;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 64,
          padding: '0 80px',
          background: 'linear-gradient(135deg, #0e2b21 0%, #15392c 60%, #1c4837 100%)',
          color: '#fbf9f1',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={logoSrc} width={300} height={300} style={{ borderRadius: 32 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: '#c9993c', textTransform: 'uppercase' }}>
            Alvian Perfumes · Pucallpa
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>Perfumes árabes originales</div>
          <div style={{ fontSize: 32, color: '#e4ddc9' }}>Lattafa · Armaf · Rasasi · Afnan</div>
          <div style={{ fontSize: 28, color: '#c9993c', marginTop: 8 }}>Envíos a todo el Perú · Yape y Plin</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
