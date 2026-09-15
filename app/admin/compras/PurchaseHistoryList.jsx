'use client';

import { useMemo, useState, useTransition } from 'react';
import { deletePurchaseAction } from '@/lib/actions';
import EditPurchaseModal from './EditPurchaseModal';

function PurchaseTableRow({ purchase }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar la compra de "${purchase.perfume_name}"?`)) return;
    startTransition(async () => {
      try {
        await deletePurchaseAction(purchase.id);
      } catch (err) {
        alert(err.message || 'No se pudo eliminar la compra.');
      }
    });
  }

  return (
    <>
      <tr className="perfume-table-row">
        <td>
          <strong>{purchase.perfume_name}</strong>
          {purchase.note ? <p className="perfume-table-description">{purchase.note}</p> : null}
        </td>
        <td className="perfume-table-stock-cell">{purchase.quantity}</td>
        <td className="perfume-table-price-cell">S/ {Number(purchase.unit_cost).toFixed(2)}</td>
        <td className="perfume-table-price-cell">
          {Number(purchase.freight_cost) > 0 ? `S/ ${Number(purchase.freight_cost).toFixed(2)}` : '—'}
        </td>
        <td className="perfume-table-price-cell">S/ {Number(purchase.landed_unit_cost).toFixed(2)}</td>
        <td className="perfume-table-stock-cell">
          {new Date(purchase.created_at).toLocaleDateString('es-PE')}
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </td>
      </tr>
      {editing ? <EditPurchaseModal purchase={purchase} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

export default function PurchaseHistoryList({ purchases }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const rows = useMemo(() => {
    const filtered = search.trim()
      ? purchases.filter((p) => p.perfume_name.toLowerCase().includes(search.trim().toLowerCase()))
      : purchases;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'cost') return Number(b.landed_unit_cost) - Number(a.landed_unit_cost);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [purchases, search, sortBy]);

  if (purchases.length === 0) {
    return <p>Todavía no hay compras registradas.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar perfume..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="recent">Ordenar: más reciente</option>
          <option value="oldest">Ordenar: más antigua</option>
          <option value="cost">Ordenar: mayor costo real</option>
        </select>
        <span className="list-count">
          {rows.length} de {purchases.length} compra{purchases.length === 1 ? '' : 's'}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="hint">Ninguna compra coincide con &quot;{search}&quot;.</p>
      ) : (
        <div className="perfume-table-wrap">
          <table className="perfume-table">
            <thead>
              <tr>
                <th scope="col">Perfume / nota</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Costo unit.</th>
                <th scope="col">Flete</th>
                <th scope="col">Costo real</th>
                <th scope="col">Fecha</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((purchase) => (
                <PurchaseTableRow key={purchase.id} purchase={purchase} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
