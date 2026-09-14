'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Ingresando...' : 'Ingresar'}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, { error: null });

  return (
    <form action={formAction} className="admin-login-form">
      <h1>Acceso administrador</h1>
      <label htmlFor="username">Usuario</label>
      <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
      <label htmlFor="password">Clave</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
