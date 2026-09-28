'use client';

import { useTransition } from 'react';
import { deleteStockLossAction } from '@/lib/actions';
import { LOSS_REASONS } from '@/lib/loss-reasons';

function LossRow({ loss }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar esta pérdida? Las ${loss.quantity} unidad(es) vuelven al stock.`)) return;
    startTransition(async () => {
      const result = await deleteStockLossAction(loss.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <tr className="perfume-table-row">
      <td className="table-cards-title">
        <strong>{loss.perfume_name}</strong>{' '}
        <span className="badge badge-pending">{LOSS_REASONS[loss.reason] || loss.reason}</span>
        {loss.note ? <p className="perfume-table-description">{loss.note}</p> : null}
      </td>
      <td className="perfume-table-stock-cell" data-label="Cantidad">
        {loss.quantity}
      </td>
      <td className="perfume-table-price-cell" data-label="Costo unit.">
        S/ {Number(loss.unit_cost).toFixed(2)}
      </td>
      <td className="perfume-table-price-cell text-critical" data-label="Pérdida">
        S/ {Number(loss.total_cost).toFixed(2)}
      </td>
      <td className="perfume-table-stock-cell" data-label="Fecha">
        {new Date(loss.occurred_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
      </td>
      <td className="perfume-table-actions-cell">
        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Eliminando...' : 'Eliminar'}
        </button>
      </td>
    </tr>
  );
}

export default function LossesList({ losses }) {
  if (losses.length === 0) {
    return <p className="hint">No has registrado pérdidas de producto.</p>;
  }

  return (
    <div className="perfume-table-wrap">
      <table className="perfume-table table-cards">
        <thead>
          <tr>
            <th scope="col">Perfume / motivo</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Costo unit.</th>
            <th scope="col">Pérdida</th>
            <th scope="col">Fecha</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {losses.map((loss) => (
            <LossRow key={loss.id} loss={loss} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
