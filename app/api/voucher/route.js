import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

// Subida pública del comprobante de pago desde el checkout (sin sesión).
// Solo acepta imágenes/PDF pequeños dentro de la carpeta "comprobantes/"; el
// nombre final lleva un sufijo aleatorio, así que la URL no se puede adivinar.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^comprobantes\/[\w.\- ]{1,120}$/.test(pathname)) {
          throw new Error('Nombre de archivo no válido.');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'],
          maximumSizeInBytes: 6 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
