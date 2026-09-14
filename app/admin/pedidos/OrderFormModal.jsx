'use client';

import { useState } from 'react';
import OrderForm from './OrderForm';

export default function OrderFormModal({ perfumes }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nuevo pedido
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <OrderForm perfumes={perfumes} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
