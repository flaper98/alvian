import { ReportSkeleton } from './ReportStates';

// Al entrar a Reportes, mientras se cargan los datos.
export default function Loading() {
  return (
    <section className="admin-section reports">
      <div className="admin-header">
        <h1>Reportes</h1>
      </div>
      <ReportSkeleton />
    </section>
  );
}
