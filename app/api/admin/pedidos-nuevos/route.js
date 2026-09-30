import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, getSessionRole } from '@/lib/auth';
import { getNewWebOrders } from '@/lib/store-db';

// El panel consulta aquí cada pocos segundos si entraron pedidos web nuevos.
export async function GET(request) {
  const cookieStore = await cookies();
  let role = null;
  try {
    role = getSessionRole(cookieStore.get(COOKIE_NAME)?.value);
  } catch (error) {
    role = null;
  }
  if (!role) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const since = request.nextUrl.searchParams.get('since');
    const data = await getNewWebOrders(since);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo consultar.' }, { status: 500 });
  }
}
