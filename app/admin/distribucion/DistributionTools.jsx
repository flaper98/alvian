'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteEnvelopeTransferAction, saveDistributionConfigAction, transferEnvelopeAction } from '@/lib/actions';

const TRANSFER_LABELS = { sueldo: 'Tu sueldo', reserva: 'Colchón', reinversion: 'Para crecer', impuestos: 'Impuestos' };
const money = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function TransferButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Pasando…' : 'Pasar dinero'}
    </button>
  );
}

function UndoTransfer({ id }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="pivot-remove"
      aria-label="Deshacer traspaso"
      title="Deshacer"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm('¿Deshacer este traspaso? El dinero vuelve al sobre de origen.')) return;
        startTransition(async () => {
          const result = await deleteEnvelopeTransferAction(id);
          if (result?.error) window.alert(result.error);
        });
      }}
    >
      ×
    </button>
  );
}

/**
 * Pasar dinero de un sobre a otro sin tocar la Caja. Ej.: el sueldo que no
 * sacaste se pasa a la Reserva para pagar la deuda.
 */
export function EnvelopeTransfer({ balances, transfers = [] }) {
  const [state, formAction] = useActionState(transferEnvelopeAction, { error: null });
  const [from, setFrom] = useState(balances.sueldo > 0 ? 'sueldo' : 'reinversion');
  const [to, setTo] = useState('reserva');
  const [amount, setAmount] = useState(balances.sueldo > 0 ? String(balances.sueldo) : '');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (state?.success) {
      setDone(true);
      setAmount('');
    }
  }, [state]);

  return (
    <div className="chart-card envelope-transfer no-print">
      <h3 className="chart-title">Pasar dinero entre sobres</h3>
      <p className="hint">
        Por ejemplo, tu sueldo que no sacaste al Colchón para pagar la deuda. No sale dinero de la Caja: solo cambia de
        sobre.
      </p>
      <form action={formAction} className="envelope-transfer-form" onChange={() => setDone(false)}>
        <label>
          De
          <select
            name="from"
            value={from}
            onChange={(event) => {
              const next = event.target.value;
              setFrom(next);
              if (to === next) setTo(next === 'reserva' ? 'reinversion' : 'reserva');
            }}
          >
            {Object.entries(TRANSFER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label} ({money(balances[key] || 0)})
              </option>
            ))}
          </select>
        </label>
        <label>
          A
          <select name="to" value={to} onChange={(event) => setTo(event.target.value)}>
            {Object.entries(TRANSFER_LABELS)
              .filter(([key]) => key !== from)
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Monto (S/)
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          Nota (opcional)
          <input name="note" type="text" placeholder="Ej: sueldo de octubre para la deuda" />
        </label>
        <TransferButton />
      </form>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {done ? <p className="form-ok">Listo: el dinero cambió de sobre.</p> : null}
      {transfers.length ? (
        <ul className="envelope-transfer-list">
          {transfers.map((t) => (
            <li key={t.id}>
              <span>
                {new Date(t.occurred_at).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })} ·{' '}
                {TRANSFER_LABELS[t.envelope] || t.envelope} → {TRANSFER_LABELS[t.to_envelope] || t.to_envelope}
                {t.note ? ` · ${t.note}` : ''}
              </span>
              <strong>{money(t.amount)}</strong>
              <UndoTransfer id={t.id} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar porcentajes'}
    </button>
  );
}

/** Porcentajes editables. Muestra en vivo si el reparto suma 100%. */
export function DistributionConfigForm({ config, commissionPercent }) {
  const [state, formAction] = useActionState(saveDistributionConfigAction, { error: null });
  const [values, setValues] = useState({
    reinvestPercent: config.reinvestPercent,
    salaryPercent: config.salaryPercent,
    reservePercent: config.reservePercent,
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (state?.success) setSaved(true);
  }, [state]);

  const sum =
    Number(values.reinvestPercent || 0) + Number(values.salaryPercent || 0) + Number(values.reservePercent || 0);
  const set = (key) => (event) => {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: event.target.value }));
  };

  return (
    <form action={formAction} className="dist-config">
      <div className="dist-config-grid dist-config-two">
        <label>
          Comisión vendedora %
          <input name="commissionPercent" type="number" min="0" max="100" step="0.5" defaultValue={commissionPercent} />
        </label>
        {/* Sin IGV: el negocio no cobra impuesto en sus precios. */}
        <input type="hidden" name="taxPercent" value="0" />
        <label>
          Alerta si el margen es menor a %
          <input name="minMarginPercent" type="number" min="0" max="100" step="1" defaultValue={config.minMarginPercent} />
        </label>
      </div>
      <p className="dist-config-caption">
        Reparto de la utilidad neta <span>(debe sumar 100%)</span>
      </p>
      <div className="dist-config-grid dist-config-three">
        <label>
          <span>Reinversión %</span>
          <input name="reinvestPercent" type="number" min="0" max="100" step="1" value={values.reinvestPercent} onChange={set('reinvestPercent')} />
        </label>
        <label>
          <span>Sueldo %</span>
          <input name="salaryPercent" type="number" min="0" max="100" step="1" value={values.salaryPercent} onChange={set('salaryPercent')} />
        </label>
        <label>
          <span>Reserva %</span>
          <input name="reservePercent" type="number" min="0" max="100" step="1" value={values.reservePercent} onChange={set('reservePercent')} />
        </label>
      </div>
      <div className="dist-config-bar" aria-hidden="true">
        <span style={{ flexGrow: Number(values.reinvestPercent) || 0, background: 'var(--green-900)' }} />
        <span style={{ flexGrow: Number(values.salaryPercent) || 0, background: 'var(--dist-salary)' }} />
        <span style={{ flexGrow: Number(values.reservePercent) || 0, background: 'var(--dist-reserve)' }} />
        {sum < 100 ? <span style={{ flexGrow: 100 - sum, background: 'transparent' }} /> : null}
      </div>
      <p className={Math.abs(sum - 100) < 0.001 ? 'form-ok' : 'form-error'}>
        Suma: {sum}% {Math.abs(sum - 100) < 0.001 ? '✓' : '— debe ser 100%'}
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {saved ? <p className="form-ok">Porcentajes guardados.</p> : null}
      <div className="dist-config-foot">
        <p className="hint">
          Los cambios se aplican solo a las ventas nuevas: las ventas ya registradas conservan los porcentajes con que se
          calcularon.
        </p>
        <SaveButton />
      </div>
    </form>
  );
}

/** Exportar a Excel (CSV) o PDF (vista para imprimir / guardar como PDF). */
export function ExportButtons({ rows, totals, fileName }) {
  function downloadCsv() {
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const num = (value) => Number(value).toFixed(2).replace('.', ',');
    const header = [
      'Fecha', 'Perfume', 'Cliente', 'Pago', 'Precio', 'Costo', 'Comisión', 'Envío', 'Otros', 'Impuesto',
      'Utilidad neta', 'Margen %', 'Reinversión', 'Sueldo', 'Reserva', 'Alerta',
    ];
    const lines = [
      header.map(escape).join(';'),
      ...rows.map((r) =>
        [
          r.dateLabel, r.perfume_name, r.customer_name || '', r.payment_type,
          num(r.price), num(r.cost), num(r.commission), num(r.logistics), num(r.other_costs), num(r.tax),
          num(r.net_profit), num(r.margin_percent), num(r.reinvest), num(r.salary), num(r.reserve),
          [r.low_margin ? 'Margen bajo' : '', r.cost_unknown ? 'Sin costo registrado' : ''].filter(Boolean).join(' · '),
        ].map(escape).join(';'),
      ),
      [
        'TOTAL', '', '', '', num(totals.price), num(totals.cost), num(totals.commission), num(totals.logistics),
        num(totals.otherCosts), num(totals.tax), num(totals.netProfit), num(totals.margin), num(totals.reinvest),
        num(totals.salary), num(totals.reserve), '',
      ].map(escape).join(';'),
    ];
    const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="distribution-export no-print">
      <button type="button" className="btn-secondary" onClick={downloadCsv} disabled={rows.length === 0}>
        Descargar Excel
      </button>
      <button type="button" className="btn-secondary" onClick={() => window.print()}>
        Guardar PDF / Imprimir
      </button>
    </div>
  );
}
