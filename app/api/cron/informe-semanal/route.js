import { NextResponse } from 'next/server';
import { cronOk } from '@/lib/agente-auth';
import { generateWeeklyReport } from '@/lib/weekly-report';

// Tarea programada (vercel.json): cada lunes a las 8:00 de Lima arma el
// informe de la semana que terminó y lo envía por correo. Si esa semana ya
// se envió (por ejemplo, un reintento), no lo repite.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request) {
  if (!cronOk(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  try {
    const { report, skipped } = await generateWeeklyReport({ send: true, skipIfSent: true });
    return NextResponse.json(
      {
        ok: true,
        week: report.week_start,
        skipped,
        sent: Boolean(report.sent_at),
        sendError: report.send_error,
        aiError: report.ai_error,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
