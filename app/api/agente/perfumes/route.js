import { NextResponse } from 'next/server';
import { listPerfumes } from '@/lib/db';
import { tokenOk } from '@/lib/agente-auth';

// Lista los perfumes con su precio y stock para que el agente encuentre el id
// correcto antes de registrar una venta. Con ?q= filtra por nombre o marca.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  if (!tokenOk(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim().toLowerCase();
    const perfumes = await listPerfumes();
    const matches = q
      ? perfumes.filter((p) =>
          `${p.name} ${p.brand || ''}`.toLowerCase().includes(q),
        )
      : perfumes;

    return NextResponse.json(
      {
        ok: true,
        perfumes: matches.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: Number(p.price),
          stock: p.stock,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo consultar el catálogo.' }, { status: 500 });
  }
}
