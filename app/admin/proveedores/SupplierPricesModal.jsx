'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addSupplierPriceAction, bulkAddSupplierPricesAction } from '@/lib/actions';

function SubmitButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

/** Campo "Nivel de precio" con los niveles que ya usa el proveedor como atajos,
 * para no escribir "6 a 11" de una forma distinta cada vez. */
function TierField({ tiers, value, onChange }) {
  return (
    <div className="tier-field">
      <label>
        Nivel de precio
        <input
          name="tierLabel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej: 6 a 11, 12+, Unidad, Por mayor, 5K"
          autoComplete="off"
          required
        />
      </label>
      {tiers.length > 0 ? (
        <div className="tier-shortcuts" role="group" aria-label="Niveles existentes">
          {tiers.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`filter-chip${value === tier ? ' active' : ''}`}
              aria-pressed={value === tier}
              onClick={() => onChange(tier)}
            >
              {tier}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BulkResult({ result }) {
  const groups = [
    ['ok', 'Guardados en tu catálogo', result.matched.map((m) => m.perfumeName)],
    ['warn', 'Guardados, pero no están en tu catálogo', (result.unlinked || []).map((u) => u.perfumeName)],
    ['error', 'Coinciden con más de un perfume (no se guardaron)', result.ambiguous.map((a) => a.productRaw)],
    ['error', 'No se pudo leer la línea', (result.failed || []).map((f) => f.line)],
  ].filter(([, , items]) => items.length > 0);

  return (
    <div className="bulk-result" role="status">
      {groups.map(([tone, title, items]) => (
        <details key={title} className={`bulk-result-group bulk-${tone}`} open={tone === 'error'}>
          <summary>
            <strong>{items.length}</strong> {title}
          </summary>
          <p>{items.join(' · ')}</p>
        </details>
      ))}
    </div>
  );
}

function BulkForm({ supplierId, tiers }) {
  const [state, formAction] = useActionState(bulkAddSupplierPricesAction.bind(null, supplierId), { error: null });
  const [tier, setTier] = useState(tiers[0] || '');
  const [text, setText] = useState('');
  const lineCount = text.split('\n').filter((line) => line.trim()).length;

  useEffect(() => {
    if (state?.success) setText('');
  }, [state]);

  return (
    <form action={formAction} className="prices-form">
      <TierField tiers={tiers} value={tier} onChange={setTier} />
      <label>
        Lista de precios
        <textarea
          name="rawText"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'Mandarin Sky: 109\nHawas Ice: 135\nYara Moi: 109'}
          required
        />
      </label>
      <p className="hint">
        Una línea por producto: <code>Nombre: precio</code>. También puedes copiar dos columnas de
        Excel. Si el producto ya tenía precio en ese nivel, se actualiza.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.result ? <BulkResult result={state.result} /> : null}
      <div className="prices-form-actions">
        <SubmitButton
          label={lineCount ? `Guardar ${lineCount} precio${lineCount === 1 ? '' : 's'}` : 'Guardar precios'}
          pendingLabel="Guardando…"
        />
      </div>
    </form>
  );
}

function SingleForm({ supplierId, tiers, perfumes }) {
  const [state, formAction] = useActionState(addSupplierPriceAction.bind(null, supplierId), { error: null });
  const [tier, setTier] = useState(tiers[0] || '');
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) setFormKey((k) => k + 1);
  }, [state]);

  return (
    <form action={formAction} className="prices-form">
      <TierField tiers={tiers} value={tier} onChange={setTier} />
      <div className="prices-form-row" key={formKey}>
        <label>
          Perfume de tu catálogo
          <select name="perfumeId" required defaultValue="">
            <option value="" disabled>
              Elige un perfume
            </option>
            {perfumes.map((perfume) => (
              <option key={perfume.id} value={perfume.id}>
                {perfume.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Precio (S/)
          <input name="price" type="number" min="0" step="0.01" inputMode="decimal" required />
        </label>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-ok">Precio guardado. Puedes agregar otro.</p> : null}
      <div className="prices-form-actions">
        <SubmitButton label="Guardar precio" pendingLabel="Guardando…" />
      </div>
    </form>
  );
}

export default function SupplierPricesModal({ supplier, perfumes, tiers, onClose }) {
  const [mode, setMode] = useState('bulk');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog modal-dialog-prices"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prices-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <div className="perfume-form prices-modal">
          <div>
            <h2 id="prices-modal-title">Cargar precios</h2>
            <p className="hint">{supplier.name}</p>
          </div>
          <div className="segmented" role="tablist">
            {[
              ['bulk', 'Pegar lista'],
              ['single', 'Uno por uno'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                className={mode === key ? 'active' : ''}
                onClick={() => setMode(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'bulk' ? (
            <BulkForm supplierId={supplier.id} tiers={tiers} />
          ) : (
            <SingleForm supplierId={supplier.id} tiers={tiers} perfumes={perfumes} />
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
