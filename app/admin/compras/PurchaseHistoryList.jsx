'use client';

import { useMemo, useState, useTransition } from 'react';
import { deletePurchaseAction, setPurchaseNotReceivedAction } from '@/lib/actions';
import { PaidWithBadge } from '../PaidWithField';
import EditPurchaseModal from './EditPurchaseModal';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Mes en hora de Lima ('2026-09') para filtrar por período.
const monthOf = (date) => new Date(new Date(date).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 7);
function currentMonths() {
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  const thisMonth = now.toISOString().slice(0, 7);
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() - 1);
  return { thisMonth, lastMonth: now.toISOString().slice(0, 7) };
}

const PERIODS = [
  { key: 'mes', label: 'Este mes' },
  { key: 'mes-pasado', label: 'Mes pasado' },
  { key: 'todo', label: 'Todo' },
];
// "capital" = pagado de tu bolsillo; lo demás salió de la caja (lo que entró por ventas): reinversión.
const ORIGINS = [
  { key: 'all', label: 'Todas' },
  { key: 'reinversion', label: 'Reinversión' },
  { key: 'capital', label: 'De tu bolsillo' },
  { key: 'no-llego', label: 'No llegó' },
];
const isCapital = (purchase) => purchase.paid_with === 'capital';

/**
 * Totales de las compras filtradas: cuánto, de tu bolsillo y reinvertido, y en
 * qué perfumes. Las que no llegaron (estafa) no son mercadería: van aparte.
 */
function PurchaseSummary({ rows: allRows }) {
  const sum = (list) => list.reduce((total, p) => total + Number(p.total_cost), 0);
  const lostRows = allRows.filter((p) => p.not_received);
  const rows = allRows.filter((p) => !p.not_received);
  const units = rows.reduce((total, p) => total + Number(p.quantity), 0);
  const capital = sum(rows.filter(isCapital));
  const reinvestedRows = rows.filter((p) => !isCapital(p));
  const reinvested = sum(reinvestedRows);
  const total = capital + reinvested;
  const pct = (part) => (total > 0 ? Math.round((part / total) * 100) : 0);

  const byPerfume = new Map();
  for (const p of reinvestedRows) {
    const item = byPerfume.get(p.perfume_name) || { name: p.perfume_name, units: 0, total: 0 };
    item.units += Number(p.quantity);
    item.total += Number(p.total_cost);
    byPerfume.set(p.perfume_name, item);
  }
  const reinvestDetail = [...byPerfume.values()].sort((a, b) => b.total - a.total);

  return (
    <div className="purchase-summary">
      <div className="kpi-grid">
        <div className="kpi-tile">
          <span className="kpi-label">Mercadería comprada</span>
          <strong className="kpi-value">{soles(total)}</strong>
          <span className="kpi-sub">
            {rows.length} compra{rows.length === 1 ? '' : 's'} · {units} unidad{units === 1 ? '' : 'es'}
          </span>
        </div>
        <div className="kpi-tile kpi-tile-good">
          <span className="kpi-label">Reinvertido</span>
          <strong className="kpi-value">{soles(reinvested)}</strong>
          <span className="kpi-sub">{pct(reinvested)}% · pagado con la caja (lo que entró por tus ventas)</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">De tu bolsillo</span>
          <strong className="kpi-value">{soles(capital)}</strong>
          <span className="kpi-sub">{pct(capital)}% · dinero tuyo</span>
        </div>
        <div className="kpi-tile">
          <span className="kpi-label">Costo promedio por unidad</span>
          <strong className="kpi-value">{units > 0 ? soles(total / units) : '—'}</strong>
          <span className="kpi-sub">Con flete incluido</span>
        </div>
        {lostRows.length ? (
          <div className="kpi-tile kpi-tile-bad">
            <span className="kpi-label">No llegó (pérdida)</span>
            <strong className="kpi-value">{soles(sum(lostRows))}</strong>
            <span className="kpi-sub">
              {lostRows.length} compra{lostRows.length === 1 ? '' : 's'} pagada{lostRows.length === 1 ? '' : 's'} que nunca
              llegó · cuenta como pérdida, no como mercadería
            </span>
          </div>
        ) : null}
      </div>
      {reinvestDetail.length ? (
        <details className="purchase-reinvest">
          <summary>
            Detalle de la reinversión: en qué perfumes se reinvirtió ({reinvestDetail.length})
          </summary>
          <div className="pivot-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Perfume</th>
                  <th scope="col" className="num">
                    Unidades
                  </th>
                  <th scope="col" className="num">
                    Reinvertido
                  </th>
                  <th scope="col" className="num">
                    % de la reinversión
                  </th>
                </tr>
              </thead>
              <tbody>
                {reinvestDetail.map((item) => (
                  <tr key={item.name}>
                    <th scope="row">{item.name}</th>
                    <td className="num">{item.units}</td>
                    <td className="num">{soles(item.total)}</td>
                    <td className="num">{reinvested > 0 ? Math.round((item.total / reinvested) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}

/** Confirmación para marcar una compra como "No llegó", con la opción de sacarla del stock. */
function NotReceivedModal({ purchase, onClose }) {
  const [removeStock, setRemoveStock] = useState(true);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function confirm() {
    setError('');
    startTransition(async () => {
      const result = await setPurchaseNotReceivedAction(purchase.id, true, removeStock);
      if (result?.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <div className="perfume-form">
          <h2>¿Esta compra no llegó?</h2>
          <p className="hint">
            {purchase.perfume_name} × {purchase.quantity} · {soles(purchase.total_cost)}. Úsalo si pagaste y nunca te
            llegó (estafa o pedido perdido). El dinero sigue contando como salido (en la caja o en «Tu dinero»), pero
            deja de ser mercadería: no cuenta en el costo de tus perfumes y se suma a tus pérdidas.
          </p>
          <label className="checkbox-field">
            <input type="checkbox" checked={removeStock} onChange={(event) => setRemoveStock(event.target.checked)} />
            Sacar {purchase.quantity} del stock
          </label>
          <p className="hint">Desmárcalo si ya bajaste el stock a mano en el Catálogo.</p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions">
            <button type="button" className="btn-primary" disabled={isPending} onClick={confirm}>
              {isPending ? 'Guardando…' : 'Sí, no llegó'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseTableRow({ purchase }) {
  const [editing, setEditing] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleReceived() {
    const back = purchase.not_received_stock ? ` Se devuelven ${purchase.quantity} al stock.` : '';
    if (!confirm(`¿Esta compra sí llegó? Vuelve a contar como mercadería.${back}`)) return;
    startTransition(async () => {
      const result = await setPurchaseNotReceivedAction(purchase.id, false);
      if (result?.error) alert(result.error);
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la compra de "${purchase.perfume_name}"?`)) return;
    startTransition(async () => {
      try {
        const result = await deletePurchaseAction(purchase.id);
        if (result?.error) alert(result.error);
      } catch (err) {
        alert(err.message || 'No se pudo eliminar la compra.');
      }
    });
  }

  return (
    <>
      <tr className={`perfume-table-row${purchase.not_received ? ' purchase-row-lost' : ''}`}>
        <td className="table-cards-title">
          <strong>{purchase.perfume_name}</strong>{' '}
          {isCapital(purchase) ? (
            <PaidWithBadge value={purchase.paid_with} />
          ) : (
            <span className="badge badge-paid">Reinversión</span>
          )}{' '}
          {purchase.not_received ? <span className="badge badge-debt">No llegó · pérdida</span> : null}
          {purchase.note ? <p className="perfume-table-description">{purchase.note}</p> : null}
        </td>
        <td className="perfume-table-stock-cell" data-label="Cantidad">{purchase.quantity}</td>
        <td className="perfume-table-price-cell" data-label="Costo unit.">
          {soles(purchase.unit_cost)}
        </td>
        <td className="perfume-table-price-cell" data-label="Flete">
          {Number(purchase.freight_cost) > 0 ? soles(purchase.freight_cost) : '—'}
        </td>
        <td className="perfume-table-price-cell" data-label="Costo real">
          {soles(purchase.landed_unit_cost)}
        </td>
        <td className="perfume-table-price-cell" data-label="Total">
          <strong>{soles(purchase.total_cost)}</strong>
        </td>
        <td className="perfume-table-stock-cell" data-label="Fecha">
          {new Date(purchase.created_at).toLocaleDateString('es-PE')}
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
          {purchase.not_received ? (
            <button type="button" className="btn-secondary" onClick={handleReceived} disabled={isPending}>
              Sí llegó
            </button>
          ) : (
            <button type="button" className="btn-secondary" onClick={() => setMarkingLost(true)} disabled={isPending}>
              No llegó
            </button>
          )}
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </td>
      </tr>
      {editing ? <EditPurchaseModal purchase={purchase} onClose={() => setEditing(false)} /> : null}
      {markingLost ? <NotReceivedModal purchase={purchase} onClose={() => setMarkingLost(false)} /> : null}
    </>
  );
}

export default function PurchaseHistoryList({ purchases }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [period, setPeriod] = useState('todo');
  const [origin, setOrigin] = useState('all');

  const rows = useMemo(() => {
    const { thisMonth, lastMonth } = currentMonths();
    const term = search.trim().toLowerCase();
    const filtered = purchases.filter(
      (p) =>
        (!term || p.perfume_name.toLowerCase().includes(term)) &&
        (period === 'todo' || monthOf(p.created_at) === (period === 'mes' ? thisMonth : lastMonth)) &&
        (origin === 'all' ||
          (origin === 'no-llego'
            ? p.not_received
            : !p.not_received && (origin === 'capital' ? isCapital(p) : !isCapital(p)))),
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'cost') return Number(b.landed_unit_cost) - Number(a.landed_unit_cost);
      if (sortBy === 'total') return Number(b.total_cost) - Number(a.total_cost);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [purchases, search, sortBy, period, origin]);

  if (purchases.length === 0) {
    return <p>Todavía no hay compras registradas.</p>;
  }

  return (
    <div className="purchase-history">
      <div className="filter-chips" role="group" aria-label="Período y origen del dinero">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`filter-chip${period === p.key ? ' active' : ''}`}
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
        <span className="purchase-chip-sep" aria-hidden="true" />
        {ORIGINS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`filter-chip${origin === o.key ? ' active' : ''}`}
            aria-pressed={origin === o.key}
            onClick={() => setOrigin(o.key)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <PurchaseSummary rows={rows} />

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
          <option value="total">Ordenar: mayor total</option>
          <option value="cost">Ordenar: mayor costo real</option>
        </select>
        <span className="list-count">
          {rows.length} de {purchases.length} compra{purchases.length === 1 ? '' : 's'}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="hint">Ninguna compra coincide con la búsqueda o el filtro.</p>
      ) : (
        <div className="perfume-table-wrap">
          <table className="perfume-table table-cards">
            <thead>
              <tr>
                <th scope="col">Perfume / nota</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Costo unit.</th>
                <th scope="col">Flete</th>
                <th scope="col">Costo real</th>
                <th scope="col">Total</th>
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
