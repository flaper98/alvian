'use client';

import { useEffect, useState } from 'react';
import AddPerfumeForm from './AddPerfumeForm';

export default function PerfumeFormModal({ prefillName }) {
  const [open, setOpen] = useState(Boolean(prefillName));

  // Si llegas desde Proveedores con un nombre precargado, el modal se abre
  // solo para que no tengas que buscar el botón.
  useEffect(() => {
    if (prefillName) setOpen(true);
  }, [prefillName]);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nuevo perfume
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
            <AddPerfumeForm prefillName={prefillName} onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
