'use client';

import { useMemo, useState } from 'react';
import OrderRow from './OrderRow';
import ReceiveStockModal from './ReceiveStockModal';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'shortage', label: 'Falta comprar' },
  { value: 'ready', label: 'Listos para entregar' },
  { value: 'fulfilled', label: 'Cumplidos' },
];

export default function OrdersList({ orders, perfumes, canReceive }) {
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [receiving, setReceiving] = useState(false);

  const notStocked = useMemo(() => orders.filter((order) => !order.stocked), [orders]);

  const withStatus = useMemo(
    () => orders.map((order) => ({ ...order, shortOnStock: order.perfume_stock < order.quantity })),
    [orders],
  );

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return withStatus;
    return withStatus.filter(
      (o) =>
        o.customer_name.toLowerCase().includes(term) ||
        o.perfume_name.toLowerCase().includes(term) ||
        (o.order_code || '').toLowerCase().includes(term),
    );
  }, [withStatus, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      shortage: searched.filter((o) => !o.fulfilled && o.shortOnStock).length,
      ready: searched.filter((o) => !o.fulfilled && !o.shortOnStock).length,
      fulfilled: searched.filter((o) => o.fulfilled).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    return searched.filter((order) => {
      if (filterBy === 'shortage') return !order.fulfilled && order.shortOnStock;
      if (filterBy === 'ready') return !order.fulfilled && !order.shortOnStock;
      if (filterBy === 'fulfilled') return order.fulfilled;
      return true;
    });
  }, [searched, filterBy]);

  if (orders.length === 0) {
    return <p>Todavía no hay pedidos. Agrega el primero arriba.</p>;
  }

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          placeholder="Buscar cliente, perfume o código..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canReceive && notStocked.length > 0 ? (
          <button type="button" className="btn-primary" onClick={() => setReceiving(true)}>
            Ingresar a stock ({notStocked.length})
          </button>
        ) : null}
        <span className="list-count">
          {rows.length} de {orders.length} pedido{orders.length === 1 ? '' : 's'}
        </span>
      </div>
      {receiving ? <ReceiveStockModal orders={notStocked} onClose={() => setReceiving(false)} /> : null}

      <div className="filter-chips">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip${filterBy === filter.value ? ' active' : ''}`}
            onClick={() => setFilterBy(filter.value)}
          >
            {filter.label} <span className="filter-chip-count">{filterCounts[filter.value]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="hint">Ningún pedido coincide con este filtro.</p>
      ) : (
        <div className="perfume-table-wrap">
          <table className="perfume-table">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Cliente</th>
                <th scope="col">Perfume</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Estado</th>
                <th scope="col">Stock actual</th>
                <th scope="col">Fecha</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <OrderRow key={order.id} order={order} perfumes={perfumes} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
