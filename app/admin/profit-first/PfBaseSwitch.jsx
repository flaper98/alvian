'use client';

import { useTransition } from 'react';
import { setPfBaseAction } from '@/lib/actions';
import { PF_BASES } from '@/lib/profit-first';

export default function PfBaseSwitch({ base }) {
  const [isPending, startTransition] = useTransition();

  function choose(value) {
    if (value === base) return;
    startTransition(async () => {
      const result = await setPfBaseAction(value);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="filter-chips" role="group" aria-label="Base del reparto">
      {Object.entries(PF_BASES).map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={`filter-chip${base === value ? ' active' : ''}`}
          aria-pressed={base === value}
          disabled={isPending}
          onClick={() => choose(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
