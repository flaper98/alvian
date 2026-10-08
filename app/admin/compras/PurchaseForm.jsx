'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerPurchaseAction } from '@/lib/actions';
import { suggestPrice } from '@/lib/pricing.mjs';
import PaidWithField from '../PaidWithField';
import PurchaseCost from '../PurchaseCost';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar compra'}
    </button>
  );
}

export default function PurchaseForm({ perfumes, prefill, pricing, costs = {}, onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <PurchaseFormFields
      key={formKey}
      perfumes={perfumes}
      prefill={prefill}
      pricing={pricing}
      costs={costs}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}

const soles = (value) => `S/ ${Number(value).toFixed(2)}`;

function PurchaseFormFields({ perfumes, prefill, pricing, costs, onSaved }) {
  const [state, formAction] = useActionState(registerPurchaseAction, { error: null });
  const [perfumeId, setPerfumeId] = useState(String(prefill?.perfumeId || ''));
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState(prefill?.unitCost || '');
  const [freightCost, setFreightCost] = useState('');
  const [marginPerUnit, setMarginPerUnit] = useState('');

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  const landedUnitCost = useMemo(() => {
    const q = Number(quantity);
    const c = Number(unitCost);
    const f = freightCost === '' ? 0 : Number(freightCost);
    if (!q || q <= 0 || unitCost === '' || Number.isNaN(c) || Number.isNaN(f)) return null;
    return (q * c + f) / q;
  }, [quantity, unitCost, freightCost]);

  const suggestedPrice = useMemo(() => {
    if (landedUnitCost === null || marginPerUnit === '') return null;
    const margin = Number(marginPerUnit);
    if (Number.isNaN(margin)) return null;
    return landedUnitCost + margin;
  }, [landedUnitCost, marginPerUnit]);

  // Precio automático (Catálogo → Precios): con el nuevo costo promedio, ¿a cuánto
  // quedará el precio? Solo sube si quedó por debajo de tu margen.
  const auto = pricing?.config?.auto ? pricing.config : null;
  const info = pricing?.perfumes?.[perfumeId];
  const autoPrice = useMemo(() => {
    if (!auto || !info || info.locked || landedUnitCost === null || marginPerUnit !== '') return null;
    const q = Number(quantity);
    const newAvg =
      info.avgCost != null && info.units > 0 ? (info.avgCost * info.units + landedUnitCost * q) / (info.units + q) : landedUnitCost;
    const price = suggestPrice(newAvg, { ...pricing.rates, marginPercent: auto.marginPercent, rounding: auto.rounding });
    if (price == null) return null;
    return { price, current: info.price, raises: info.price < price };
  }, [auto, info, pricing, landedUnitCost, marginPerUnit, quantity]);

  let priceHint;
  if (suggestedPrice !== null) priceHint = `Se guardará como precio de venta: ${soles(suggestedPrice)}`;
  else if (autoPrice?.raises)
    priceHint = `Con tu margen automático (${auto.marginPercent}%), el precio de venta pasará de ${soles(autoPrice.current)} a ${soles(autoPrice.price)}.`;
  else if (autoPrice)
    priceHint = `Su precio (${soles(autoPrice.current)}) ya cumple tu margen de ${auto.marginPercent}%: no cambia.`;
  else if (auto && info?.locked) priceHint = 'Este perfume tiene precio fijo: no cambia solo.';
  else if (auto) priceHint = `Si lo dejas vacío, el precio se ajusta solo a tu margen de ${auto.marginPercent}% (solo sube).`;
  else priceHint = 'Si completas la ganancia, el precio de venta del producto se actualiza solo (se ve en la tienda).';

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar compra</h2>
      <label>
        Perfume
        <select
          name="perfumeId"
          required
          defaultValue={prefill?.perfumeId || ''}
          onChange={(event) => setPerfumeId(event.target.value)}
        >
          <option value="" disabled>
            Selecciona un perfume
          </option>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id}>
              {perfume.name} (stock actual: {perfume.stock})
            </option>
          ))}
        </select>
      </label>
      {perfumeId ? (
        <div className="purchase-cost-box">
          <span>Lo compraste antes a (promedio con flete)</span>
          <PurchaseCost cost={costs[perfumeId]} />
        </div>
      ) : null}
      <label>
        Cantidad comprada
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
      <label>
        Costo unitario (S/)
        <input
          name="unitCost"
          type="number"
          min="0"
          step="0.01"
          required
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
        />
      </label>
      <label>
        Flete / envío total (S/)
        <input
          name="freightCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={freightCost}
          onChange={(event) => setFreightCost(event.target.value)}
        />
      </label>

      {landedUnitCost !== null ? (
        <p className="hint">Costo real por unidad: S/ {landedUnitCost.toFixed(2)}</p>
      ) : null}

      <label>
        {auto ? 'Ganancia fija por unidad (opcional, en vez de tu margen)' : 'Ganancia deseada por unidad (S/)'}
        <input
          name="marginPerUnit"
          type="number"
          min="0"
          step="0.01"
          placeholder={auto ? 'Vacío = tu margen automático' : 'Ej: 15.00'}
          value={marginPerUnit}
          onChange={(event) => setMarginPerUnit(event.target.value)}
        />
      </label>
      <p className="hint">{priceHint}</p>

      <label>
        Nota (opcional)
        <input
          name="note"
          type="text"
          placeholder="Ej: proveedor, lote, etc."
          defaultValue={prefill?.note || ''}
        />
      </label>
      <PaidWithField />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
