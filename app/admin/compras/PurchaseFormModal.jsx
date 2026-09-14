'use client';

import { useEffect, useState } from 'react';
import PurchaseForm from './PurchaseForm';

export default function PurchaseFormModal({ perfumes, prefill }) {
  const hasPrefill = Boolean(prefill?.perfumeId);
  const [open, setOpen] = useState(hasPrefill);

  // Si llegas desde Proveedores con un perfume y costo precargados, el modal
  // se abre solo para que no tengas que buscar el botón.
  useEffect(() => {
    if (hasPrefill) setOpen(true);
  }, [hasPrefill]);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nueva compra
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
            <PurchaseForm perfumes={perfumes} prefill={prefill} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
