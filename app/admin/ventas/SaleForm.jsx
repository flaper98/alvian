'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerSaleAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : 'Registrar venta'}
    </button>
  );
}

export default function SaleForm({ perfumes, onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <SaleFormFields
      key={formKey}
      perfumes={perfumes}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}

function SaleFormFields({ perfumes, onSaved }) {
  const [state, formAction] = useActionState(registerSaleAction, { error: null });
  const [paymentType, setPaymentType] = useState('contado');
  const [unitPrice, setUnitPrice] = useState('');

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  function handlePerfumeChange(event) {
    const perfume = perfumes.find((item) => String(item.id) === event.target.value);
    setUnitPrice(perfume && Number(perfume.price) > 0 ? Number(perfume.price).toFixed(2) : '');
  }

  return (
    <form action={formAction} className="perfume-form">
      <h2>Registrar venta</h2>
      <label>
        Perfume
        <select name="perfumeId" required defaultValue="" onChange={handlePerfumeChange}>
          <option value="" disabled>
            Selecciona un perfume
          </option>
          {perfumes.map((perfume) => (
            <option key={perfume.id} value={perfume.id} disabled={perfume.stock <= 0}>
              {perfume.name} (stock: {perfume.stock})
            </option>
          ))}
        </select>
      </label>
      <label>
        Cantidad
        <input name="quantity" type="number" min="1" step="1" required />
      </label>
      <label>
        Precio de venta (S/)
        <input
          name="unitPrice"
          type="number"
          min="0"
          step="0.01"
          required
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
        />
      </label>
      <label>
        Forma de pago
        <select
          name="paymentType"
          required
          value={paymentType}
          onChange={(event) => setPaymentType(event.target.value)}
        >
          <option value="contado">Contado</option>
          <option value="credito">Crédito</option>
          <option value="pandero">Pandero</option>
        </select>
      </label>
      <label>
        Cliente {['credito', 'pandero'].includes(paymentType) ? '(obligatorio)' : '(opcional)'}
        <input name="customerName" type="text" required={['credito', 'pandero'].includes(paymentType)} />
      </label>
      <label className="checkbox-field">
        <input name="delivered" type="checkbox" defaultChecked />
        Ya le entregué el/los perfume(s)
      </label>
      <p className="hint">
        Desmarca esta casilla si todavía no le entregas el producto al cliente (por ejemplo,
        vendió varios perfumes a crédito y solo entregaste algunos). Podrás marcarlo como
        entregado más adelante desde Ventas o desde Resumen.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
