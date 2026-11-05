'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { generateWeeklyReportAction } from '@/lib/actions';

/** Generar el informe ahora (con o sin enviarlo) y copiarlo para WhatsApp. */
export default function ReportTools({ report }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = (send) =>
    startTransition(async () => {
      setResult(null);
      const response = await generateWeeklyReportAction(send);
      setResult(response);
      if (response.id) router.push(`/admin/informe?id=${response.id}`);
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(report.text);
    } catch {
      // Sin permiso de portapapeles: se muestra para copiar a mano.
      window.prompt('Copia este texto:', report.text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="chart-card informe-tools">
      <div className="informe-buttons">
        <button type="button" className="btn-primary" disabled={pending} onClick={() => run(true)}>
          {pending ? 'Generando… (puede tardar un minuto)' : 'Generar y enviarme por correo'}
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => run(false)}>
          Generar sin enviar
        </button>
        {report ? (
          <button type="button" className="btn-secondary" onClick={copy}>
            {copied ? '¡Copiado!' : 'Copiar para WhatsApp'}
          </button>
        ) : null}
      </div>
      {result?.error ? <p className="form-error">{result.error}</p> : null}
      {result && !result.error ? (
        <p className={result.sent ? 'form-ok' : 'hint'}>
          {result.sent ? 'Listo: informe generado y enviado a tu correo.' : 'Listo: informe generado.'}
          {result.sendError ? ` No se envió: ${result.sendError}` : ''}
        </p>
      ) : null}
      <p className="hint">Siempre es la última semana completa (lunes a domingo). Si la vuelves a generar, se reemplaza.</p>
    </div>
  );
}
