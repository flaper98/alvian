'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addSupplierPriceAction,
  bulkAddSupplierPricesAction,
  deleteSupplierPriceAction,
  deleteSupplierAction,
} from '@/lib/actions';

function SaveButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function AddPriceForm({ supplierId, perfumes }) {
  const boundAction = addSupplierPriceAction.bind(null, supplierId);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="pandero-add-form">
      <select name="perfumeId" required defaultValue="">
        <option value="" disabled>
          Perfume
        </option>
        {perfumes.map((perfume) => (
          <option key={perfume.id} value={perfume.id}>
            {perfume.name}
          </option>
        ))}
      </select>
      <input name="tierLabel" type="text" placeholder="Nivel (ej: Por mayor, 5K)" required />
      <input name="price" type="number" min="0" step="0.01" placeholder="Precio" required />
      <SaveButton label="Agregar" pendingLabel="Guardando..." />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

function BulkAddForm({ supplierId }) {
  const boundAction = bulkAddSupplierPricesAction.bind(null, supplierId);
  const [state, formAction] = useActionState(boundAction, { error: null });
  const [textKey, setTextKey] = useState(0);

  useEffect(() => {
    if (state?.success) setTextKey((k) => k + 1);
  }, [state]);

  return (
    <form action={formAction} className="supplier-bulk-form">
      <label>
        Nivel de precio para todo el lote (ej: Por mayor, 5K, 10K, 30K a más, Mayorista)
        <input name="tierLabel" type="text" placeholder="Ej: 5K" required />
      </label>
      <label>
        Pega una línea por producto: "Nombre  precio" (separados por tab, o "Nombre: precio")
        <textarea
          key={textKey}
          name="rawText"
          rows={5}
          placeholder={'HAWAS ICE RASASI 100ML: 135\nODYSSEY MANDARIN SKY 100ML: 112'}
          required
        />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SaveButton label="Procesar lista" pendingLabel="Procesando..." />

      {state?.result ? (
        <div className="supplier-bulk-result">
          {state.result.matched.length > 0 ? (
            <p className="supplier-bulk-ok">
              ✓ Guardado, vinculado a tu catálogo ({state.result.matched.length}):{' '}
              {state.result.matched.map((m) => `${m.perfumeName} (S/ ${Number(m.price).toFixed(2)})`).join(', ')}
            </p>
          ) : null}
          {state.result.unlinked?.length > 0 ? (
            <p className="supplier-bulk-warn">
              ✓ Guardado, pero no está en tu catálogo todavía ({state.result.unlinked.length}):{' '}
              {state.result.unlinked.map((u) => `${u.perfumeName} (S/ ${Number(u.price).toFixed(2)})`).join(', ')} —
              igual aparecerá en la comparación de precios de abajo.
            </p>
          ) : null}
          {state.result.ambiguous.length > 0 ? (
            <p className="form-error">
              Ambiguo, coincide con más de un perfume de tu catálogo ({state.result.ambiguous.length}):{' '}
              {state.result.ambiguous.map((a) => a.productRaw).join(', ')}
            </p>
          ) : null}
          {state.result.failed?.length > 0 ? (
            <p className="form-error">
              No se pudo leer la línea ({state.result.failed.length}):{' '}
              {state.result.failed.map((u) => u.line).join(' / ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function PriceRow({ price }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteSupplierPriceAction(price.id);
    });
  }

  return (
    <li className="supplier-price-row">
      <span>
        {price.perfume_name}
        {price.unlinked ? <span className="badge badge-pending"> Sin catálogo</span> : null}
      </span>
      <span className="badge badge-contado">{price.tier_label}</span>
      <strong>S/ {Number(price.price).toFixed(2)}</strong>
      <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
        Quitar
      </button>
    </li>
  );
}

export default function SupplierCard({ supplier, perfumes, prices }) {
  const [isPending, startTransition] = useTransition();

  function handleDeleteSupplier() {
    if (!confirm(`¿Eliminar al proveedor "${supplier.name}" y todos sus precios?`)) return;
    startTransition(async () => {
      await deleteSupplierAction(supplier.id);
    });
  }

  return (
    <div className="pandero-group-card">
      <div className="pandero-group-header">
        <div>
          <h3>{supplier.name}</h3>
          {supplier.note ? <p className="hint">{supplier.note}</p> : null}
        </div>
        <button type="button" className="btn-danger" onClick={handleDeleteSupplier} disabled={isPending}>
          Eliminar proveedor
        </button>
      </div>

      {prices.length === 0 ? (
        <p>Todavía no tiene precios registrados.</p>
      ) : (
        <ul className="supplier-price-list">
          {prices.map((price) => (
            <PriceRow key={price.id} price={price} />
          ))}
        </ul>
      )}

      <AddPriceForm supplierId={supplier.id} perfumes={perfumes} />
      <BulkAddForm supplierId={supplier.id} />
    </div>
  );
}
