'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOrderAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar pedido'}
    </button>
  );
}

let nextRowId = 0;
function newRow() {
  nextRowId += 1;
  return nextRowId;
}

export default function OrderForm({ perfumes, onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <OrderFormFields
      key={formKey}
      perfumes={perfumes}
      onSaved={() => {
        setFormKey((k) => k + 1);
        onSaved?.();
      }}
    />
  );
}

function OrderFormFields({ perfumes, onSaved }) {
  const [state, formAction] = useActionState(createOrderAction, { error: null });
  const [rowIds, setRowIds] = useState(() => [newRow()]);

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  function addRow() {
    setRowIds((current) => [...current, newRow()]);
  }

  function removeRow(id) {
    setRowIds((current) => (current.length > 1 ? current.filter((rowId) => rowId !== id) : current));
  }

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar pedido</h2>
      <label>
        Cliente
        <input name="customerName" type="text" placeholder="¿Quién lo pidió?" required />
      </label>

      <div className="order-items-list">
        {rowIds.map((rowId) => (
          <div className="order-item-row" key={rowId}>
            <select name="perfumeId" required defaultValue="">
              <option value="" disabled>
                Selecciona un perfume
              </option>
              {perfumes.map((perfume) => (
                <option key={perfume.id} value={perfume.id}>
                  {perfume.name} (stock actual: {perfume.stock})
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min="1" step="1" placeholder="Cant." required />
            <button
              type="button"
              className="btn-danger"
              onClick={() => removeRow(rowId)}
              disabled={rowIds.length === 1}
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn-secondary" onClick={addRow}>
        + Agregar otro perfume
      </button>

      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: color, talla, para cuándo lo quiere" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
      <p className="hint">
        Aquí solo anotas el compromiso (quién y qué quiere). El precio y el pago se registran
        después, cuando lo compres y lo vendas normalmente en Ventas. Si un cliente pide varios
        perfumes a la vez, agrégalos todos aquí: quedarán bajo un mismo código de pedido.
      </p>
    </form>
  );
}
