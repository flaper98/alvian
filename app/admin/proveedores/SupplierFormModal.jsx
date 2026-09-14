'use client';

import { useState } from 'react';
import SupplierForm from './SupplierForm';

export default function SupplierFormModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nuevo proveedor
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
            <SupplierForm onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
