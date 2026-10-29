import { NextResponse } from 'next/server';
import { createExpense } from '@/lib/db';
import { EXPENSE_CATEGORY_KEYS } from '@/lib/expense-categories';
import { tokenOk } from '@/lib/agente-auth';

// Registra un gasto del negocio dictado por chat.
// Ojo: las comisiones NO entran aquí. Se calculan solas en cada venta y se
// pagan desde /admin/comisiones; registrarlas como gasto las contaría dos veces.
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

  const description = String(body.description || '').trim();
  const amount = Number(body.amount);
  const note = body.note ? String(body.note).trim() : null;
  const paidWith = String(body.paidWith || '');
  const category = String(body.category || '');

  if (!description) {
    return NextResponse.json({ error: 'La descripción es obligatoria.' }, { status: 400 });
  }
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'El monto no es válido.' }, { status: 400 });
  }
  if (!['capital', 'ganancias'].includes(paidWith)) {
    return NextResponse.json(
      { error: 'paidWith debe ser capital o ganancias.' },
      { status: 400 },
    );
  }
  if (!EXPENSE_CATEGORY_KEYS.includes(category)) {
    return NextResponse.json(
      { error: `La categoría debe ser una de: ${EXPENSE_CATEGORY_KEYS.join(', ')}.` },
      { status: 400 },
    );
  }

  try {
    const expense = await createExpense({ description, amount, note, paidWith, category });
    return NextResponse.json({ ok: true, expense }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
