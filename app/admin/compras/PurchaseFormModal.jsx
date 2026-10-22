'use client';

import { useEffect, useState } from 'react';
import PurchaseForm from './PurchaseForm';
import PurchaseBatchForm from './PurchaseBatchForm';

export default function PurchaseFormModal({ perfumes, prefill, pricing, costs = {}, suppliers = [], supplierPrices = {} }) {
  const hasPrefill = Boolean(prefill?.perfumeId);
  const [open, setOpen] = useState(hasPrefill);
  // Por defecto, el pedido a un proveedor (varios perfumes); "Un perfume" es el formulario de siempre.
  const [mode, setMode] = useState(hasPrefill ? 'one' : 'batch');

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
          <div className="modal-dialog modal-dialog-wide" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <div className="filter-chips batch-mode" role="group" aria-label="Tipo de compra">
              <button
                type="button"
                className={`filter-chip${mode === 'batch' ? ' active' : ''}`}
                aria-pressed={mode === 'batch'}
                onClick={() => setMode('batch')}
              >
                Varios perfumes de un proveedor
              </button>
              <button
                type="button"
                className={`filter-chip${mode === 'one' ? ' active' : ''}`}
                aria-pressed={mode === 'one'}
                onClick={() => setMode('one')}
              >
                Un perfume
              </button>
            </div>
            {mode === 'batch' ? (
              <PurchaseBatchForm
                perfumes={perfumes}
                suppliers={suppliers}
                supplierPrices={supplierPrices}
                costs={costs}
                onSaved={() => setOpen(false)}
              />
            ) : (
              <PurchaseForm
                perfumes={perfumes}
                prefill={prefill}
                pricing={pricing}
                costs={costs}
                onSaved={() => setOpen(false)}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
