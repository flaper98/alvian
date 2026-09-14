'use client';

import { useEffect, useState, useTransition } from 'react';
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

function CreateUserForm() {
  const [formKey, setFormKey] = useState(0);
  return <CreateUserFormFields key={formKey} onSaved={() => setFormKey((k) => k + 1)} />;
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

export default function UsersDashboard({ users }) {
  return (
    <div className="admin-dashboard">
      <CreateUserForm />

      <section>
        <h2>Usuarios registrados ({users.length})</h2>
        {users.length === 0 ? (
          <p>Todavía no hay usuarios. Agrega el primero arriba.</p>
        ) : (
          <ul className="perfume-list">
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
