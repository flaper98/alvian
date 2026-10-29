import { NextResponse } from 'next/server';
import { createSale } from '@/lib/db';
import { tokenOk } from '@/lib/agente-auth';

// Registra una venta que Flavio dictó por chat (la mayoría llegan por WhatsApp).
// Usa createSale, el mismo camino que el formulario del panel: descuenta stock,
// calcula la comisión de la vendedora y guarda el desglose de la venta.
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!tokenOk(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'El cuerpo no es JSON válido.' }, { status: 400 });
  }

  const perfumeId = Number(body.perfumeId);
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unitPrice);
  const paymentType = String(body.paymentType || '');
  const customerName = body.customerName ? String(body.customerName).trim() : '';
  const delivered = body.delivered === undefined ? true : Boolean(body.delivered);

  if (!Number.isInteger(perfumeId) || perfumeId <= 0) {
    return NextResponse.json({ error: 'perfumeId no es válido.' }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'La cantidad no es válida.' }, { status: 400 });
  }
  if (Number.isNaN(unitPrice) || unitPrice < 0) {
    return NextResponse.json({ error: 'El precio no es válido.' }, { status: 400 });
  }
  if (!['contado', 'credito', 'pandero'].includes(paymentType)) {
    return NextResponse.json(
      { error: 'La forma de pago debe ser contado, credito o pandero.' },
      { status: 400 },
    );
  }
  if (['credito', 'pandero'].includes(paymentType) && !customerName) {
    return NextResponse.json(
      { error: 'El nombre del cliente es obligatorio en ventas a crédito o pandero.' },
      { status: 400 },
    );
  }

  try {
    const sale = await createSale({
      perfumeId,
      quantity,
      unitPrice,
      paymentType,
      customerName: customerName || null,
      // Vianca es quien vende; el rol 'vendedora' es el que dispara la comisión.
      soldByRole: 'vendedora',
      soldByName: 'Vianca',
      delivered,
    });
    return NextResponse.json({ ok: true, sale }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // createSale avisa con mensajes claros (por ejemplo, stock insuficiente).
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
