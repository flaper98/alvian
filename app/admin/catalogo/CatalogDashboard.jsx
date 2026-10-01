'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { deletePerfumeAction, editPerfumeAction } from '@/lib/actions';
import { SubmitButton, ImageField, VideoField, StoreFields } from './AddPerfumeForm';
import BulkDescriptionModal from './BulkDescriptionModal';
import PerfumeFormModal from './PerfumeFormModal';

function EditPerfumeForm({ perfume, onCancel, onSaved }) {
  const boundAction = editPerfumeAction.bind(null, perfume.id);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Editar perfume</h2>
      <label>
        Nombre
        <input name="name" type="text" defaultValue={perfume.name} required />
      </label>
      <label>
        Precio de venta (S/)
        <input name="price" type="number" step="0.01" min="0" defaultValue={perfume.price} />
      </label>
      <label>
        Stock
        <input name="stock" type="number" min="0" step="1" defaultValue={perfume.stock} required />
        <span className="hint">
          Úsalo solo para corregir errores de conteo. Si un perfume se rompió, se perdió o lo
          regalaste, regístralo en Gastos y retiros → Pérdidas para que reste de tu ganancia.
        </span>
      </label>
      <label>
        Categoría
        <select name="category" defaultValue={perfume.category || ''}>
          <option value="">Sin especificar</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
          <option value="unisex">Unisex</option>
        </select>
      </label>
      <ImageField defaultValue={perfume.image_url} />
      <VideoField defaultValue={perfume.video_url} />
      <label>
        Detalle
        <textarea name="description" rows={3} defaultValue={perfume.description || ''} />
      </label>
      <StoreFields perfume={perfume} />
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

function EditPerfumeModal({ perfume, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
        <EditPerfumeForm perfume={perfume} onCancel={onClose} onSaved={onClose} />
      </div>
    </div>
  );
}

function PerfumeTableRow({ perfume }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lowStock = Number(perfume.stock) <= 3;

  function handleDelete() {
    if (!confirm(`¿Eliminar "${perfume.name}"?`)) return;
    startTransition(async () => {
      try {
        const result = await deletePerfumeAction(perfume.id);
        if (result?.error) alert(result.error);
      } catch (err) {
        alert('No se pudo eliminar. Vuelve a iniciar sesión e inténtalo de nuevo.');
      }
    });
  }

  return (
    <>
      <tr className="perfume-table-row">
        <td className="perfume-table-image-cell table-cards-thumb">
          {hasImage(perfume) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfume.image_url} alt={perfume.name} className="perfume-table-image" />
          ) : (
            <span className="perfume-table-image perfume-table-noimage">Sin foto</span>
          )}
        </td>
        <td className="table-cards-title">
          <strong>{perfume.name}</strong>{' '}
          {!hasImage(perfume) ? <span className="badge badge-debt">Sin imagen · oculto en la tienda</span> : null}{' '}
          {perfume.category ? (
            <span className="badge badge-gold">{CATEGORY_LABELS[perfume.category]}</span>
          ) : (
            <span className="badge badge-pending">Sin categoría</span>
          )}
          {perfume.description ? (
            <p className="perfume-table-description">{perfume.description}</p>
          ) : null}
        </td>
        <td className="perfume-table-price-cell" data-label="Precio">
          {Number(perfume.price) > 0 ? (
            `S/ ${Number(perfume.price).toFixed(2)}`
          ) : (
            <span className="badge badge-pending">Pendiente</span>
          )}
        </td>
        <td className={`perfume-table-stock-cell${lowStock ? ' text-critical' : ''}`} data-label="Stock">
          {perfume.stock}
        </td>
        <td className="perfume-table-stock-cell" data-label="Registrado">
          {perfume.created_at ? (
            <time dateTime={new Date(perfume.created_at).toISOString()} title={dateTimeFmt.format(new Date(perfume.created_at))}>
              {dateFmt.format(new Date(perfume.created_at))}
            </time>
          ) : (
            '—'
          )}
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
        </td>
      </tr>
      {editing ? <EditPerfumeModal perfume={perfume} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

const CATEGORY_LABELS = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };

// Fecha de registro en hora de Lima (igual en el servidor y en el navegador).
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
const dateTimeFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' });

// Los perfumes agregados desde Proveedores llegan sin foto y no salen en la tienda hasta tenerla.
const hasImage = (perfume) => Boolean(String(perfume.image_url || '').trim());

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'in-stock', label: 'Con stock' },
  { value: 'out-of-stock', label: 'Sin stock' },
  { value: 'pending-price', label: 'Pendiente de compra' },
  { value: 'no-category', label: 'Sin categoría' },
  { value: 'no-image', label: 'Sin imagen' },
];

export default function CatalogDashboard({ perfumes, prefillName, initialFilter = 'all' }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(initialFilter === 'no-image' ? 'recent' : 'name');
  const [filterBy, setFilterBy] = useState(initialFilter);

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
      'no-category': searched.filter((p) => !p.category).length,
      'no-image': searched.filter((p) => !hasImage(p)).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    const filtered = searched.filter((perfume) => {
      if (filterBy === 'in-stock') return Number(perfume.stock) > 0;
      if (filterBy === 'out-of-stock') return Number(perfume.stock) === 0;
      if (filterBy === 'pending-price') return Number(perfume.price) === 0;
      if (filterBy === 'no-category') return !perfume.category;
      if (filterBy === 'no-image') return !hasImage(perfume);
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'stock') return Number(b.stock) - Number(a.stock);
      if (sortBy === 'price') return Number(b.price) - Number(a.price);
      if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      return a.name.localeCompare(b.name);
    });
  }, [searched, filterBy, sortBy]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Perfumes registrados ({perfumes.length})</h2>
        <div className="admin-header-actions">
          <BulkDescriptionModal />
          <PerfumeFormModal prefillName={prefillName} />
        </div>
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
              <option value="recent">Ordenar: registrados más recientes</option>
              <option value="oldest">Ordenar: registrados más antiguos</option>
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
            <div className="perfume-table-wrap">
              <table className="perfume-table table-cards">
                <thead>
                  <tr>
                    <th scope="col">Imagen</th>
                    <th scope="col">Nombre</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Stock</th>
                    <th scope="col">Registrado</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((perfume) => (
                    <PerfumeTableRow key={perfume.id} perfume={perfume} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
