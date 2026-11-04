'use client';

import { useEffect } from 'react';

// Si algo falla fuera de una pestaña (por ejemplo, la conexión): mensaje y reintento.
export default function ReportsError({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="admin-section reports">
      <div className="admin-header">
        <h1>Reportes</h1>
      </div>
      <div className="chart-card report-error" role="alert">
        <h3 className="chart-title">No se pudo cargar el reporte</h3>
        <p className="form-error">Revisa tu conexión e inténtalo de nuevo.</p>
        <div>
          <button type="button" className="btn-primary" onClick={() => retry()}>
            Reintentar
          </button>
        </div>
      </div>
    </section>
  );
}
