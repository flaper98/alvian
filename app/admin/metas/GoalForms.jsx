'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { createGoalAction, deleteGoalAction, saveMonthlyGoalsAction, updateGoalAction } from '@/lib/actions';
import { GOAL_METRICS, MONTHLY_METRICS } from '@/lib/goals.mjs';

const soles = (value) =>
  `S/ ${Number(value || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Guardando...' : children}
    </button>
  );
}

function GoalFields({ goal }) {
  return (
    <div className="goal-form-grid">
      <label className="goal-form-title">
        Nombre de la meta
        <input name="title" required maxLength={120} defaultValue={goal.title} />
      </label>
      <label>
        Qué dinero quieres juntar
        <select name="metric" defaultValue={goal.metric}>
          {Object.entries(GOAL_METRICS).map(([key, m]) => (
            <option key={key} value={key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto (S/)
        <input name="target" type="number" min="1" step="0.01" required defaultValue={goal.target} />
      </label>
      <label>
        Para el
        <input name="deadline" type="date" required defaultValue={goal.deadline} />
      </label>
    </div>
  );
}

/** Formulario para crear una meta (abierto si todavía no hay ninguna). */
export function NewGoalForm({ defaults, startOpen }) {
  const [open, setOpen] = useState(startOpen);
  const [state, formAction] = useActionState(createGoalAction, { error: null });
  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        + Nueva meta de dinero
      </button>
    );
  }
  return (
    <form action={formAction} className="chart-card goal-form">
      <h3 className="chart-title">Nueva meta de dinero</h3>
      <GoalFields goal={defaults} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="goal-form-actions">
        <SubmitButton>Guardar meta</SubmitButton>
        {startOpen ? null : (
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/** Editar o borrar una meta existente, desde su tarjeta. */
export function GoalTools({ goal }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(updateGoalAction.bind(null, goal.id), { error: null });
  const [deleting, startDelete] = useTransition();
  useEffect(() => {
    if (state?.success) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="goal-tools">
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Editar
        </button>
        <button
          type="button"
          className="btn-danger"
          disabled={deleting}
          onClick={() => {
            if (window.confirm(`¿Borrar la meta «${goal.title}»?`)) startDelete(() => deleteGoalAction(goal.id));
          }}
        >
          {deleting ? 'Borrando...' : 'Borrar'}
        </button>
      </div>
    );
  }
  return (
    <form action={formAction} className="goal-form goal-form-inline">
      <GoalFields goal={goal} />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="goal-form-actions">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Metas de un mes: un campo por indicador, con la sugerencia según tus últimos meses. */
export function MonthlyGoalsForm({ month, monthLabel, metrics }) {
  const [state, formAction] = useActionState(saveMonthlyGoalsAction.bind(null, month), { error: null });
  const [values, setValues] = useState(() =>
    Object.fromEntries(metrics.map((m) => [m.key, m.target == null ? '' : String(m.target)])),
  );
  const hasSuggestions = metrics.some((m) => m.suggestion != null);

  return (
    <form action={formAction} className="chart-card goal-form">
      <div className="goal-form-head">
        <h3 className="chart-title">Tus metas de {monthLabel}</h3>
        {hasSuggestions ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setValues((current) =>
                Object.fromEntries(
                  metrics.map((m) => [m.key, m.suggestion == null ? current[m.key] : String(m.suggestion)]),
                ),
              )
            }
          >
            Usar las sugeridas
          </button>
        ) : null}
      </div>
      <p className="hint">
        Sugerida = el promedio de tus últimos 3 meses + 10%. Deja un campo vacío si no quieres esa meta.
      </p>
      <div className="goal-form-grid">
        {MONTHLY_METRICS.map((metric) => {
          const suggestion = metrics.find((m) => m.key === metric.key)?.suggestion;
          return (
            <label key={metric.key}>
              {metric.label}
              {metric.money ? ' (S/)' : ''}
              <input
                name={metric.key}
                type="number"
                min="0"
                step={metric.money ? '0.01' : '1'}
                value={values[metric.key]}
                onChange={(event) => setValues((v) => ({ ...v, [metric.key]: event.target.value }))}
              />
              {suggestion != null ? (
                <span className="hint">Sugerida: {metric.money ? soles(suggestion) : suggestion}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-ok">Metas guardadas.</p> : null}
      <div className="goal-form-actions">
        <SubmitButton>Guardar metas del mes</SubmitButton>
      </div>
    </form>
  );
}
