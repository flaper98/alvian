'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveDistributionConfigAction } from '@/lib/actions';

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
    <form action={formAction} className="prices-form distribution-config">
      <div className="distribution-config-grid">
        <label>
          Comisión vendedora %
          <input name="commissionPercent" type="number" min="0" max="100" step="0.5" defaultValue={commissionPercent} />
        </label>
        <label>
          Impuesto estimado %
          <input name="taxPercent" type="number" min="0" max="100" step="0.1" defaultValue={config.taxPercent} />
        </label>
        <label>
          Alerta si el margen es menor a %
          <input name="minMarginPercent" type="number" min="0" max="100" step="1" defaultValue={config.minMarginPercent} />
        </label>
      </div>
      <p className="hint">Reparto de la utilidad neta (debe sumar 100%):</p>
      <div className="distribution-config-grid">
        <label>
          Reinversión %
          <input name="reinvestPercent" type="number" min="0" max="100" step="1" value={values.reinvestPercent} onChange={set('reinvestPercent')} />
        </label>
        <label>
          Sueldo %
          <input name="salaryPercent" type="number" min="0" max="100" step="1" value={values.salaryPercent} onChange={set('salaryPercent')} />
        </label>
        <label>
          Reserva %
          <input name="reservePercent" type="number" min="0" max="100" step="1" value={values.reservePercent} onChange={set('reservePercent')} />
        </label>
      </div>
      <p className={Math.abs(sum - 100) < 0.001 ? 'form-ok' : 'form-error'}>
        Suma: {sum}% {Math.abs(sum - 100) < 0.001 ? '✓' : '— debe ser 100%'}
      </p>
      <p className="hint">
        Los cambios se aplican solo a las ventas nuevas: las ventas ya registradas conservan los
        porcentajes con que se calcularon.
      </p>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {saved ? <p className="form-ok">Porcentajes guardados.</p> : null}
      <div className="prices-form-actions">
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
