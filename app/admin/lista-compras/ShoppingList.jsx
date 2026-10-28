'use client';

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addShoppingItemAction,
  buyShoppingListAction,
  deleteShoppingItemAction,
  updateShoppingItemAction,
} from '@/lib/actions';

const soles = (value) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** El proveedor más barato para un perfume según tus listas de precios, o null. */
function cheapestFor(perfumeId, supplierPrices, suppliers) {
  let best = null;
  for (const s of suppliers) {
    const price = supplierPrices[s.id]?.[perfumeId];
    if (price != null && (!best || price < best.price)) best = { supplierId: s.id, name: s.name, price };
  }
  return best;
}

function SubmitButton({ children, disabled }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || disabled}>
      {pending ? 'Guardando...' : children}
    </button>
  );
}

function AddItemForm({ catalog, suppliers, supplierPrices }) {
  const [state, formAction] = useActionState(addShoppingItemAction, { error: null });
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const nameRef = useRef(null);

  const byName = useMemo(() => new Map(catalog.map((p) => [p.name.toLowerCase(), p])), [catalog]);
  const perfume = byName.get(name.trim().toLowerCase()) || null;
  const best = perfume ? cheapestFor(perfume.id, supplierPrices, suppliers) : null;

  // Precio sugerido: el de este proveedor; si no, tu última compra.
  const suggest = (p, supplier) => {
    if (!p) return '';
    const fromSupplier = supplierPrices[supplier]?.[p.id];
    if (fromSupplier != null) return String(fromSupplier);
    return p.lastCost != null ? String(p.lastCost) : '';
  };

  // Después de agregar, el formulario queda listo para el siguiente perfume.
  useEffect(() => {
    if (!state?.success) return;
    setName('');
    setPrice('');
    setQuantity('1');
    nameRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="chart-card shop-add">
      <h2 className="chart-title">Agregar a la lista</h2>
      <datalist id="shop-perfumes">
        {catalog.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      <div className="shop-add-grid">
        <label className="shop-add-name">
          Perfume
          <input
            ref={nameRef}
            list="shop-perfumes"
            required
            placeholder="Escribe el nombre…"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              const found = byName.get(value.trim().toLowerCase());
              if (found) setPrice(suggest(found, supplierId));
            }}
          />
        </label>
        <label>
          Proveedor
          <select
            name="supplierId"
            value={supplierId}
            onChange={(event) => {
              setSupplierId(event.target.value);
              if (perfume) setPrice(suggest(perfume, event.target.value) || price);
            }}
          >
            <option value="">Aún no decido</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cantidad
          <input
            name="quantity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label>
          Precio unit. (S/)
          <input
            name="unitPrice"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
      </div>
      <input type="hidden" name="perfumeId" value={perfume ? perfume.id : ''} />
      <input type="hidden" name="productName" value={perfume ? '' : name.trim()} />

      <div className="shop-add-info">
        {perfume ? (
          <>
            <span>
              Stock actual: <strong>{perfume.stock}</strong>
            </span>
            {perfume.salePrice != null ? (
              <span>
                Lo vendes a <strong>{soles(perfume.salePrice)}</strong>
              </span>
            ) : null}
            {perfume.lastCost != null ? <span>Última compra: {soles(perfume.lastCost)}</span> : null}
            {best && String(best.supplierId) !== supplierId ? (
              <button
                type="button"
                className="shop-link"
                onClick={() => {
                  setSupplierId(String(best.supplierId));
                  setPrice(String(best.price));
                }}
              >
                Más barato: {best.name} a {soles(best.price)} · usar
              </button>
            ) : null}
          </>
        ) : name.trim() ? (
          <span className="batch-warn">No está en el catálogo: se anota como perfume nuevo.</span>
        ) : null}
      </div>

      <label>
        Nota (opcional)
        <input name="note" type="text" maxLength={200} placeholder="Ej: lo pidió una clienta" />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton>+ Agregar</SubmitButton>
    </form>
  );
}

/** Fila editable: cantidad, precio y proveedor se guardan al salir del campo. */
function ItemRow({ item, suppliers, supplierPrices }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [price, setPrice] = useState(item.unitPrice == null ? '' : String(item.unitPrice));
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const save = (patch = {}) => {
    const next = { supplierId: item.supplierId, quantity, unitPrice: price, ...patch };
    if (
      String(next.supplierId ?? '') === String(item.supplierId ?? '') &&
      Number(next.quantity) === item.quantity &&
      String(next.unitPrice) === (item.unitPrice == null ? '' : String(item.unitPrice))
    ) {
      return;
    }
    setError('');
    startTransition(async () => {
      const result = await updateShoppingItemAction(item.id, next);
      if (result?.error) setError(result.error);
    });
  };

  const remove = () => {
    if (!window.confirm(`¿Quitar «${item.name}» de la lista?`)) return;
    startTransition(() => deleteShoppingItemAction(item.id));
  };

  const unit = Number(price) || 0;
  const sub = unit * (Number(quantity) || 0);
  const margin = item.salePrice != null && price !== '' ? item.salePrice - unit : null;
  const best = item.perfumeId ? cheapestFor(item.perfumeId, supplierPrices, suppliers) : null;
  const cheaper = best && price !== '' && best.price < unit - 0.004 && best.supplierId !== item.supplierId ? best : null;

  return (
    <tr className={isPending ? 'is-pending' : undefined}>
      <td data-label="Perfume">
        <strong>{item.name}</strong>
        <span className="report-sub">
          {item.perfumeId ? `Stock: ${item.stock}` : <span className="batch-warn">No está en el catálogo</span>}
          {item.note ? ` · ${item.note}` : ''}
        </span>
        {cheaper ? (
          <button
            type="button"
            className="shop-link"
            onClick={() => {
              setPrice(String(cheaper.price));
              save({ supplierId: cheaper.supplierId, unitPrice: String(cheaper.price) });
            }}
          >
            Más barato con {cheaper.name}: {soles(cheaper.price)} · cambiar
          </button>
        ) : null}
        {error ? <span className="form-error">{error}</span> : null}
      </td>
      <td data-label="Proveedor">
        <select
          aria-label="Proveedor"
          value={item.supplierId ?? ''}
          onChange={(event) => {
            const id = event.target.value;
            const fromSupplier = item.perfumeId ? supplierPrices[id]?.[item.perfumeId] : null;
            const unitPrice = fromSupplier != null ? String(fromSupplier) : price;
            setPrice(unitPrice);
            save({ supplierId: id, unitPrice });
          }}
        >
          <option value="">Aún no decido</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </td>
      <td data-label="Cant.">
        <input
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          aria-label="Cantidad"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          onBlur={() => save()}
        />
      </td>
      <td data-label="Precio unit.">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          aria-label="Precio unitario"
          placeholder="0.00"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          onBlur={() => save()}
        />
      </td>
      <td className="num" data-label="Subtotal">
        {price === '' ? '—' : soles(sub)}
      </td>
      <td className="num" data-label="Lo vendes a">
        {item.salePrice != null ? soles(item.salePrice) : '—'}
        {margin != null ? (
          <span className={`report-sub ${margin > 0 ? 'text-good' : 'text-critical'}`}>
            {margin >= 0 ? '+' : '−'}
            {soles(Math.abs(margin))} c/u
          </span>
        ) : null}
      </td>
      <td>
        <button type="button" className="pivot-remove" aria-label={`Quitar ${item.name}`} onClick={remove}>
          ×
        </button>
      </td>
    </tr>
  );
}

/** Texto para mandarle el pedido al proveedor por WhatsApp. */
function orderText(group) {
  const lines = group.items.map((i) => `• ${i.quantity} × ${i.name}`);
  return `Hola${group.name ? ` ${group.name}` : ''}, quisiera hacer este pedido:\n${lines.join('\n')}\n¡Gracias!`;
}

function CopyOrderButton({ group }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(orderText(group));
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? '¡Copiado!' : 'Copiar pedido para WhatsApp'}
    </button>
  );
}

/** Confirma la compra de un proveedor: flete y nota, y pasa todo a Compras. */
function BuyModal({ group, onClose }) {
  const [state, formAction] = useActionState(buyShoppingListAction.bind(null, group.supplierId), { error: null });
  const ready = group.items.filter((i) => i.perfumeId && i.unitPrice != null);
  const skipped = group.items.length - ready.length;
  const [freight, setFreight] = useState('');
  const total = group.ready + (Number(freight) || 0);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <form action={formAction} className="perfume-form">
          <h2>Registrar compra a {group.name}</h2>
          <p className="hint">
            Se registran {ready.length} perfume{ready.length === 1 ? '' : 's'} en Compras, se suman al stock y salen de
            la lista.
          </p>
          {skipped > 0 ? (
            <p className="batch-warn">
              {skipped} se quedan en la lista: falta agregarlos al catálogo o ponerles precio.
            </p>
          ) : null}
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
          <label>
            Nota (opcional)
            <input name="note" type="text" maxLength={200} placeholder="Ej: pedido de noviembre" />
          </label>
          {state?.error ? <p className="form-error">{state.error}</p> : null}
          <div className="form-actions">
            <SubmitButton disabled={ready.length === 0}>Registrar compra · {soles(total)}</SubmitButton>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ShoppingList({ items, catalog, suppliers, supplierPrices }) {
  const [buying, setBuying] = useState(null);

  // Agrupado por proveedor; lo que aún no tiene proveedor va al final.
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = item.supplierId ?? 'none';
      if (!map.has(key)) {
        map.set(key, { key, supplierId: item.supplierId, name: item.supplierName || '', items: [], total: 0, ready: 0 });
      }
      const group = map.get(key);
      const sub = (item.unitPrice || 0) * item.quantity;
      group.items.push(item);
      group.total += sub;
      if (item.perfumeId && item.unitPrice != null) group.ready += sub;
    }
    return [...map.values()].sort((a, b) => (a.supplierId == null) - (b.supplierId == null) || a.name.localeCompare(b.name));
  }, [items]);

  const units = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + (i.unitPrice || 0) * i.quantity, 0);
  const sales = items.reduce((sum, i) => sum + (i.salePrice != null && i.unitPrice != null ? i.salePrice * i.quantity : 0), 0);
  const costOfPriced = items.reduce(
    (sum, i) => sum + (i.salePrice != null && i.unitPrice != null ? i.unitPrice * i.quantity : 0),
    0,
  );
  const noPrice = items.filter((i) => i.unitPrice == null).length;

  return (
    <>
      <AddItemForm catalog={catalog} suppliers={suppliers} supplierPrices={supplierPrices} />

      {items.length === 0 ? (
        <p className="hint shop-empty">Tu lista está vacía. Agrega el primer perfume que piensas comprar.</p>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-tile">
              <span className="kpi-label">Necesitas</span>
              <strong className="kpi-value">{soles(total)}</strong>
              <span className="kpi-sub">
                {units} unidad{units === 1 ? '' : 'es'}
                {noPrice > 0 ? ` · ${noPrice} sin precio` : ''}
              </span>
            </div>
            <div className="kpi-tile">
              <span className="kpi-label">Venderías en</span>
              <strong className="kpi-value">{soles(sales)}</strong>
              <span className="kpi-sub">Con tus precios actuales</span>
            </div>
            <div className="kpi-tile kpi-tile-good">
              <span className="kpi-label">Margen aprox.</span>
              <strong className="kpi-value">{soles(sales - costOfPriced)}</strong>
              <span className="kpi-sub">Antes de comisión y flete</span>
            </div>
          </div>

          {groups.map((group) => (
            <div className="chart-card shop-group" key={group.key}>
              <div className="shop-group-head">
                <h3 className="chart-title">{group.supplierId ? group.name : 'Sin proveedor todavía'}</h3>
                <strong>{soles(group.total)}</strong>
              </div>
              <div className="shop-table-wrap">
                <table className="shop-table">
                  <thead>
                    <tr>
                      <th scope="col">Perfume</th>
                      <th scope="col">Proveedor</th>
                      <th scope="col">Cant.</th>
                      <th scope="col">Precio unit.</th>
                      <th scope="col" className="num">
                        Subtotal
                      </th>
                      <th scope="col" className="num">
                        Lo vendes a
                      </th>
                      <th scope="col">
                        <span className="visually-hidden">Quitar</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      // La key incluye los valores guardados para que la fila se reinicie si cambian desde el servidor.
                      <ItemRow
                        key={`${item.id}-${item.quantity}-${item.unitPrice}-${item.supplierId}`}
                        item={item}
                        suppliers={suppliers}
                        supplierPrices={supplierPrices}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {group.supplierId ? (
                <div className="shop-group-actions">
                  <CopyOrderButton group={group} />
                  <button type="button" className="btn-primary" onClick={() => setBuying(group)}>
                    Ya lo compré
                  </button>
                </div>
              ) : (
                <p className="hint">Elige el proveedor de cada perfume para poder registrar la compra.</p>
              )}
            </div>
          ))}
        </>
      )}

      {buying ? <BuyModal group={buying} onClose={() => setBuying(null)} /> : null}
    </>
  );
}
