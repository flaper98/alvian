'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { deletePerfumeAction, editPerfumeAction } from '@/lib/actions';
import { SubmitButton, ImageField, VideoField } from './AddPerfumeForm';
import PerfumeFormModal from './PerfumeFormModal';

function EditPerfumeForm({ perfume, onCancel, onSaved }) {
  const boundAction = editPerfumeAction.bind(null, perfume.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <label>
        Nombre
        <input name="name" type="text" defaultValue={perfume.name} required />
      </label>
      <label>
        Precio de venta (S/)
        <input name="price" type="number" step="0.01" min="0" defaultValue={perfume.price} />
      </label>
      <ImageField defaultValue={perfume.image_url} />
      <VideoField defaultValue={perfume.video_url} />
      <label>
        Detalle
        <textarea name="description" rows={3} defaultValue={perfume.description || ''} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <div className="form-actions">
        <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function PerfumeRow({ perfume }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${perfume.name}"?`)) return;
    startTransition(async () => {
      try {
        await deletePerfumeAction(perfume.id);
      } catch (err) {
        alert('No se pudo eliminar. Vuelve a iniciar sesión e inténtalo de nuevo.');
      }
    });
  }

  if (editing) {
    return (
      <li className="perfume-row perfume-row-editing">
        <EditPerfumeForm
          perfume={perfume}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="perfume-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={perfume.image_url} alt={perfume.name} className="perfume-row-image" />
      <div className="perfume-row-info">
        <strong>{perfume.name}</strong>
        <span>
          {Number(perfume.price) > 0 ? (
            `S/ ${Number(perfume.price).toFixed(2)}`
          ) : (
            <span className="badge badge-pending">Pendiente de compra (sin precio aún)</span>
          )}
          {' · Stock: '}
          {perfume.stock}
        </span>
        {perfume.description ? <p>{perfume.description}</p> : null}
      </div>
      <div className="perfume-row-actions">
        <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
          Editar
        </button>
        <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
          {isPending ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </li>
  );
}

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'in-stock', label: 'Con stock' },
  { value: 'out-of-stock', label: 'Sin stock' },
  { value: 'pending-price', label: 'Pendiente de compra' },
];

export default function CatalogDashboard({ perfumes, prefillName }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');

  const searched = useMemo(() => {
    return search.trim()
      ? perfumes.filter((perfume) => perfume.name.toLowerCase().includes(search.trim().toLowerCase()))
      : perfumes;
  }, [perfumes, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      'in-stock': searched.filter((p) => Number(p.stock) > 0).length,
      'out-of-stock': searched.filter((p) => Number(p.stock) === 0).length,
      'pending-price': searched.filter((p) => Number(p.price) === 0).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    const filtered = searched.filter((perfume) => {
      if (filterBy === 'in-stock') return Number(perfume.stock) > 0;
      if (filterBy === 'out-of-stock') return Number(perfume.stock) === 0;
      if (filterBy === 'pending-price') return Number(perfume.price) === 0;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'stock') return Number(b.stock) - Number(a.stock);
      if (sortBy === 'price') return Number(b.price) - Number(a.price);
      return a.name.localeCompare(b.name);
    });
  }, [searched, filterBy, sortBy]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Perfumes registrados ({perfumes.length})</h2>
        <PerfumeFormModal prefillName={prefillName} />
      </div>

      {perfumes.length === 0 ? (
        <p>Todavía no hay perfumes. Agrega el primero arriba.</p>
      ) : (
        <>
          <div className="list-toolbar">
            <input
              type="search"
              placeholder="Buscar perfume..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Ordenar: nombre (A-Z)</option>
              <option value="stock">Ordenar: mayor stock primero</option>
              <option value="price">Ordenar: mayor precio primero</option>
            </select>
            <span className="list-count">
              {rows.length} de {perfumes.length} perfume{perfumes.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="filter-chips">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`filter-chip${filterBy === filter.value ? ' active' : ''}`}
                onClick={() => setFilterBy(filter.value)}
              >
                {filter.label} <span className="filter-chip-count">{filterCounts[filter.value]}</span>
              </button>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="hint">
              {search.trim()
                ? <>Ningún perfume coincide con &quot;{search}&quot;.</>
                : 'Ningún perfume coincide con este filtro.'}
            </p>
          ) : (
            <ul className="perfume-list">
              {rows.map((perfume) => (
                <PerfumeRow key={perfume.id} perfume={perfume} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
