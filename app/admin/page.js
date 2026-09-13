import { getCurrentRole } from '@/lib/session';
import { getSummary } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ResumenPage() {
  const role = await getCurrentRole();

  let summary = null;
  try {
    summary = await getSummary(role);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Resumen</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  if (role === 'vendedora') {
    return (
      <section className="admin-section">
        <h1>Resumen</h1>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Tus ventas</span>
            <strong className="summary-value">{summary.salesCount}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total vendido</span>
            <strong className="summary-value">S/ {Number(summary.salesTotal).toFixed(2)}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Comisión pendiente</span>
            <strong className="summary-value">
              S/ {Number(summary.commissionPending).toFixed(2)}
            </strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Comisión ya pagada</span>
            <strong className="summary-value">
              S/ {Number(summary.commissionPaidTotal).toFixed(2)}
            </strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <h1>Resumen</h1>
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Perfumes en catálogo</span>
          <strong className="summary-value">{summary.perfumesCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Stock total</span>
          <strong className="summary-value">{summary.stockTotal}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Ventas registradas</span>
          <strong className="summary-value">{summary.salesCount}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total vendido</span>
          <strong className="summary-value">S/ {Number(summary.salesTotal).toFixed(2)}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Crédito pendiente de cobro</span>
          <strong className="summary-value">S/ {Number(summary.creditPending).toFixed(2)}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Comisión pendiente de pago</span>
          <strong className="summary-value">
            S/ {Number(summary.commissionPending).toFixed(2)}
          </strong>
        </div>
      </div>
    </section>
  );
}
