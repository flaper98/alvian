'use client';

import { useTransition } from 'react';
import { deleteCashMovementAction } from '@/lib/actions';

function CashMovementRow({ movement }) {
  const [isPending, startTransition] = useTransition();
  const isCapital = movement.kind === 'aporte';

  function handleDelete() {
    if (!confirm(`¿Eliminar este ${isCapital ? 'aporte' : 'retiro'} de S/ ${Number(movement.amount).toFixed(2)}?`)) return;
    startTransition(async () => {
      const result = await deleteCashMovementAction(movement.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <tr className="perfume-table-row">
      <td className="table-cards-title">
        <span className={`badge ${isCapital ? 'badge-paid' : 'badge-pending'}`}>
          {isCapital ? 'Aporte' : 'Retiro'}
        </span>
        {movement.note ? <p className="perfume-table-description">{movement.note}</p> : null}
      </td>
      <td className={`perfume-table-price-cell ${isCapital ? 'text-good' : 'text-critical'}`} data-label="Monto">
        {isCapital ? '+' : '−'} S/ {Number(movement.amount).toFixed(2)}
      </td>
      <td className="perfume-table-stock-cell" data-label="Fecha">
        {new Date(movement.occurred_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
      </td>
      <td className="perfume-table-actions-cell">
        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Eliminando...' : 'Eliminar'}
        </button>
      </td>
    </tr>
  );
}

export default function CashMovementsList({ movements }) {
  if (movements.length === 0) {
    return (
      <p className="hint">
        Todavía no registras aportes ni retiros. Empieza anotando el capital con el que arrancaste el
        negocio (con su fecha) para que la caja y la reinversión salgan exactas.
      </p>
    );
  }

  return (
    <div className="perfume-table-wrap">
      <table className="perfume-table table-cards">
        <thead>
          <tr>
            <th scope="col">Tipo / nota</th>
            <th scope="col">Monto</th>
            <th scope="col">Fecha</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <CashMovementRow key={movement.id} movement={movement} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
