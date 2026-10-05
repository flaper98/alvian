'use client';

import { useState } from 'react';
import SaleForm from './SaleForm';

export default function SaleFormModal({ perfumes, customers = [], decants = {} }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nueva venta
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog modal-dialog-prices" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <SaleForm perfumes={perfumes} customers={customers} decants={decants} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
