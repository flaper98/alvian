'use client';

import { useState } from 'react';
import { EXPENSE_CATEGORIES, guessExpenseCategory } from '@/lib/expense-categories';

/**
 * Descripción + categoría del gasto. Mientras no elijas una categoría a mano,
 * se sugiere sola según lo que escribes ("flete Shalom" → Fletes y envíos).
 */
export default function ExpenseFields({ expense }) {
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [touched, setTouched] = useState(Boolean(expense?.category));
  const selected = touched ? category : description.trim() ? guessExpenseCategory(description) : '';
  const hint = EXPENSE_CATEGORIES.find((c) => c.key === selected)?.hint;

  return (
    <>
      <label>
        Descripción
        <input
          name="description"
          type="text"
          placeholder="Ej: flete Shalom, bolsas de regalo, publicidad Facebook"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </label>
      <label>
        Categoría
        <select
          name="category"
          value={selected}
          onChange={(event) => {
            setCategory(event.target.value);
            setTouched(true);
          }}
          required
        >
          <option value="" disabled>
            Elige una categoría
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {hint ? <span className="hint">{hint}</span> : null}
      </label>
    </>
  );
}
