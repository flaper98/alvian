'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerPurchaseBatchAction } from '@/lib/actions';
import PaidWithField from '../PaidWithField';

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let nextRow = 1;
const emptyRow = () => ({ key: nextRow++, name: '', perfumeId: '', quantity: '1', unitCost: '' });

function SubmitButton({ count, total }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || count === 0}>
      {pending ? 'Guardando...' : `Registrar ${count} perfume${count === 1 ? '' : 's'} · ${soles(total)}`}
    </button>
  );
}

/**
 * Un pedido a un proveedor con varios perfumes: eliges el proveedor una vez y
 * vas agregando filas (perfume, cantidad, costo). El costo se completa solo con
 * el precio de ese proveedor o tu última compra. El flete se reparte por unidades.
 */
export default function PurchaseBatchForm({ perfumes, suppliers, supplierPrices = {}, costs = {}, onSaved }) {
  const [state, formAction] = useActionState(registerPurchaseBatchAction, { error: null });
  const [supplierId, setSupplierId] = useState('');
  const [rows, setRows] = useState(() => [emptyRow()]);
  const [freight, setFreight] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state, onSaved]);

  const byName = useMemo(() => new Map(perfumes.map((p) => [p.name.toLowerCase(), p])), [perfumes]);

  // Costo sugerido: lo que cobra este proveedor; si no, lo que pagaste la última vez.
  const suggestedCost = (perfumeId, supplier = supplierId) => {
    const fromSupplier = supplierPrices[supplier]?.[perfumeId];
    if (fromSupplier != null) return String(fromSupplier);
    const last = costs[perfumeId];
    if (last?.lastCost != null) return String(last.lastCost);
    if (last?.supplier?.price != null) return String(last.supplier.price);
    return '';
  };

  const update = (key, patch) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pickPerfume = (row, name) => {
    const found = byName.get(name.trim().toLowerCase());
    update(row.key, {
      name,
      perfumeId: found ? String(found.id) : '',
      // Solo se autocompleta si todavía no escribiste un costo.
      ...(found && row.unitCost === '' ? { unitCost: suggestedCost(found.id) } : {}),
    });
  };

  const addRow = () => {
    setRows((list) => [...list, emptyRow()]);
    // Foco en el perfume de la nueva fila para seguir escribiendo sin el mouse.
    setTimeout(() => listRef.current?.querySelector('tr:last-child input')?.focus(), 0);
  };

  const valid = rows.filter((r) => r.perfumeId && Number(r.quantity) > 0 && r.unitCost !== '');
  const units = valid.reduce((sum, r) => sum + Number(r.quantity), 0);
  const subtotal = valid.reduce((sum, r) => sum + Number(r.quantity) * Number(r.unitCost), 0);
  const freightValue = Number(freight) || 0;
  const total = subtotal + freightValue;
  const freightPerUnit = units > 0 ? freightValue / units : 0;

  return (
    <form action={formAction} className="perfume-form batch-form">
      <h2>Compra a un proveedor</h2>

      <label>
        Proveedor
        <select
          name="supplierId"
          value={supplierId}
          onChange={(event) => {
            const id = event.target.value;
            setSupplierId(id);
            // Al cambiar de proveedor, los costos pasan a sus precios (si los tiene).
            setRows((list) => list.map((r) => (r.perfumeId ? { ...r, unitCost: suggestedCost(r.perfumeId, id) || r.unitCost } : r)));
          }}
        >
          <option value="">Proveedor nuevo…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {!supplierId ? (
        <label>
          Nombre del proveedor nuevo
          <input name="supplierName" type="text" required placeholder="Ej: Maguel Perfumes" />
        </label>
      ) : null}

      <datalist id="batch-perfumes">
        {perfumes.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <div className="batch-table-wrap">
        <table className="batch-table">
          <thead>
            <tr>
              <th scope="col">Perfume</th>
              <th scope="col">Cant.</th>
              <th scope="col">Costo unit.</th>
              <th scope="col" className="num">
                Subtotal
              </th>
              <th scope="col">
                <span className="visually-hidden">Quitar</span>
              </th>
            </tr>
          </thead>
          <tbody ref={listRef}>
            {rows.map((row) => {
              const sub = Number(row.quantity) * Number(row.unitCost || 0);
              return (
                <tr key={row.key}>
                  <td data-label="Perfume">
                    <input
                      list="batch-perfumes"
                      placeholder="Escribe el nombre…"
                      aria-label="Perfume"
                      value={row.name}
                      aria-invalid={row.name !== '' && !row.perfumeId}
                      onChange={(event) => pickPerfume(row, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                    />
                    {row.name !== '' && !row.perfumeId ? (
                      <span className="batch-warn">No está en el catálogo</span>
                    ) : null}
                  </td>
                  <td data-label="Cant.">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      aria-label="Cantidad"
                      value={row.quantity}
                      onChange={(event) => update(row.key, { quantity: event.target.value })}
                    />
                  </td>
                  <td data-label="Costo unit.">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      aria-label="Costo unitario"
                      placeholder="0.00"
                      value={row.unitCost}
                      onChange={(event) => update(row.key, { unitCost: event.target.value })}
                      onKeyDown={(event) => {
                        // Enter en el último costo agrega otra fila en vez de guardar.
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addRow();
                        }
                      }}
                    />
                  </td>
                  <td className="num" data-label="Subtotal">
                    {sub > 0 ? soles(sub) : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="pivot-remove"
                      aria-label="Quitar fila"
                      disabled={rows.length === 1}
                      onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn-secondary batch-add" onClick={addRow}>
        + Agregar otro perfume
      </button>
      <p className="hint">Tip: escribe el costo y presiona Enter para pasar al siguiente perfume.</p>

      <label>
        Flete / envío de todo el pedido (S/)
        <input
          name="freightCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={freight}
          onChange={(event) => setFreight(event.target.value)}
        />
      </label>
      {freightValue > 0 && units > 0 ? (
        <p className="hint">Se reparte entre las {units} unidades: {soles(freightPerUnit)} por frasco.</p>
      ) : null}

      <div className="batch-total">
        <span>
          {valid.length} perfume{valid.length === 1 ? '' : 's'} · {units} unidad{units === 1 ? '' : 'es'}
        </span>
        <span>Productos {soles(subtotal)}</span>
        {freightValue > 0 ? <span>Flete {soles(freightValue)}</span> : null}
        <strong>Total {soles(total)}</strong>
      </div>

      <label>
        Nota (opcional)
        <input name="note" type="text" placeholder="Ej: pedido de octubre, lote 2" />
      </label>
      <p className="hint">Los precios de venta se ajustan solos a tu margen automático (Catálogo → Precios).</p>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(valid.map((r) => ({ perfumeId: r.perfumeId, quantity: r.quantity, unitCost: r.unitCost })))}
      />
      <PaidWithField />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton count={valid.length} total={total} />
    </form>
  );
}
