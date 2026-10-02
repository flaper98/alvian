'use client';

import { useTransition } from 'react';
import { deletePfOutflowAction } from '@/lib/actions';
import { pfCategoryLabel } from '@/lib/profit-first';

function OutflowRow({ outflow }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar esta salida de S/ ${Number(outflow.amount).toFixed(2)}?`)) return;
    startTransition(async () => {
      const result = await deletePfOutflowAction(outflow.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <tr className="perfume-table-row">
      <td className="table-cards-title">
        <span className="badge badge-pending">{pfCategoryLabel(outflow.category)}</span>
        {outflow.note ? <p className="perfume-table-description">{outflow.note}</p> : null}
      </td>
      <td className="perfume-table-price-cell text-critical" data-label="Monto">
        − S/ {Number(outflow.amount).toFixed(2)}
      </td>
      <td className="perfume-table-stock-cell" data-label="Fecha">
        {new Date(outflow.occurred_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
      </td>
      <td className="perfume-table-actions-cell">
        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Eliminando...' : 'Eliminar'}
        </button>
      </td>
    </tr>
  );
}

export default function PfOutflowsList({ outflows }) {
  if (outflows.length === 0) {
    return (
      <p className="hint">
        No hay salidas manuales en este período. Registra aquí lo que pagues de impuestos o lo que
        muevas a tu ahorro de ganancia. Los pagos de deuda se anotan en Pagos y gastos → Deudas y se
        suman solos.
      </p>
    );
  }

  return (
    <div className="perfume-table-wrap">
      <table className="perfume-table table-cards">
        <thead>
          <tr>
            <th scope="col">Categoría / nota</th>
            <th scope="col">Monto</th>
            <th scope="col">Fecha</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {outflows.map((outflow) => (
            <OutflowRow key={outflow.id} outflow={outflow} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
