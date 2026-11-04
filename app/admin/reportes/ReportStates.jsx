'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Mientras cargan los datos del reporte: la forma del panel, sin números. */
export function ReportSkeleton() {
  return (
    <div className="report-skeleton" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Cargando el reporte…</span>
      <div className="kpi-grid dash-kpis">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-tile skeleton-tile">
            <span className="skeleton-line skeleton-short" />
            <span className="skeleton-line skeleton-big" />
            <span className="skeleton-line" />
          </div>
        ))}
      </div>
      <div className="chart-card">
        <span className="skeleton-line skeleton-short" />
        <span className="skeleton-block" />
      </div>
    </div>
  );
}

/** Si un reporte no se pudo cargar: el motivo y un botón para volver a intentar. */
export function ReportError({ message }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="chart-card report-error" role="alert">
      <h3 className="chart-title">No se pudo cargar el reporte</h3>
      <p className="form-error">{message || 'Ocurrió un error inesperado.'}</p>
      <div>
        <button type="button" className="btn-primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
          {pending ? 'Reintentando…' : 'Reintentar'}
        </button>
      </div>
    </div>
  );
}
