'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  createUserAction,
  setUserActiveAction,
  resetUserPasswordAction,
} from '@/lib/actions';

const ROLE_LABELS = { admin: 'Administrador', vendedora: 'Vendedora' };

function SubmitButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function CreateUserForm({ onSaved }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <CreateUserFormFields
      key={formKey}
      onSaved={() => {
        setFormKey((k) => k + 1);
        onSaved?.();
      }}
    />
  );
}

function CreateUserFormFields({ onSaved }) {
  const [state, formAction] = useActionState(createUserAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Agregar usuario</h2>
      <label>
        Nombre
        <input name="name" type="text" placeholder="Ej: Vianca" required />
      </label>
      <label>
        Usuario
        <input
          name="username"
          type="text"
          placeholder="ej: vianca"
          pattern="[a-zA-Z0-9._-]{3,32}"
          required
        />
      </label>
      <label>
        Clave
        <input name="password" type="password" minLength={6} required />
      </label>
      <label>
        Rol
        <select name="role" required defaultValue="vendedora">
          <option value="vendedora">Vendedora</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton label="Crear usuario" pendingLabel="Creando..." />
    </form>
  );
}

function CreateUserModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Nuevo usuario
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <CreateUserForm onSaved={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ResetPasswordForm({ userId, onDone }) {
  const boundAction = resetUserPasswordAction.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, { error: null });

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="inline-form">
      <input name="password" type="password" placeholder="Nueva clave" minLength={6} required />
      <SubmitButton label="Guardar" pendingLabel="Guardando..." />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </form>
  );
}

function UserRow({ user }) {
  const [resetting, setResetting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    startTransition(async () => {
      await setUserActiveAction(user.id, !user.active);
    });
  }

  return (
    <li className="perfume-row">
      <div className="perfume-row-info">
        <strong>{user.name}</strong>
        <span>
          @{user.username} · {ROLE_LABELS[user.role] || user.role}
        </span>
        <span className={`badge ${user.active ? 'badge-paid' : 'badge-pending'}`}>
          {user.active ? 'Activo' : 'Desactivado'}
        </span>
        {resetting ? (
          <ResetPasswordForm userId={user.id} onDone={() => setResetting(false)} />
        ) : null}
      </div>
      <div className="perfume-row-actions">
        <button type="button" className="btn-secondary" onClick={() => setResetting((v) => !v)}>
          {resetting ? 'Cancelar' : 'Cambiar clave'}
        </button>
        <button type="button" className="btn-secondary" onClick={toggleActive} disabled={isPending}>
          {user.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </li>
  );
}

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Desactivados' },
];

export default function UsersDashboard({ users }) {
  const [search, setSearch] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term),
    );
  }, [users, search]);

  const filterCounts = useMemo(
    () => ({
      all: searched.length,
      active: searched.filter((u) => u.active).length,
      inactive: searched.filter((u) => !u.active).length,
    }),
    [searched],
  );

  const rows = useMemo(() => {
    return searched.filter((u) => {
      if (filterBy === 'active') return u.active;
      if (filterBy === 'inactive') return !u.active;
      return true;
    });
  }, [searched, filterBy]);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Usuarios registrados ({users.length})</h2>
        <CreateUserModal />
      </div>

      {users.length === 0 ? (
        <p>Todavía no hay usuarios. Agrega el primero arriba.</p>
      ) : (
        <section>
          <div className="list-toolbar">
            <input
              type="search"
              placeholder="Buscar por nombre o usuario..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span className="list-count">
              {rows.length} de {users.length} usuario{users.length === 1 ? '' : 's'}
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
            <p className="hint">Ningún usuario coincide con este filtro.</p>
          ) : (
            <ul className="perfume-list">
              {rows.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
