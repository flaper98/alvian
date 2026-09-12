'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { upload } from '@vercel/blob/client';
import {
  addPerfumeAction,
  deletePerfumeAction,
  editPerfumeAction,
  logoutAction,
} from '@/lib/actions';

function SubmitButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function ImageField({ defaultValue }) {
  const [imageUrl, setImageUrl] = useState(defaultValue || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      setImageUrl(blob.url);
    } catch (uploadError) {
      setError('No se pudo subir la imagen. Intenta con otra o pega una URL abajo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="image-field">
      <label>Imagen del perfume</label>
      <div className="image-field-row">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Vista previa" className="image-preview" />
        ) : (
          <div className="image-preview image-preview-empty">Sin imagen</div>
        )}
        <div className="image-field-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <input
            type="text"
            name="imageUrl"
            placeholder="o pega la URL de una imagen"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            required
          />
          {uploading ? <span className="hint">Subiendo imagen...</span> : null}
          {error ? <span className="form-error">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}

function VideoField({ defaultValue }) {
  const [videoUrl, setVideoUrl] = useState(defaultValue || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Selecciona un archivo de video.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      setVideoUrl(blob.url);
    } catch (uploadError) {
      setError('No se pudo subir el video. Intenta con otro o pega una URL abajo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="image-field">
      <label>Video del perfume (opcional)</label>
      <div className="image-field-row">
        {videoUrl ? (
          <video
            src={videoUrl}
            className="image-preview"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <div className="image-preview image-preview-empty">Sin video</div>
        )}
        <div className="image-field-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <input
            type="text"
            name="videoUrl"
            placeholder="o pega la URL de un video (ej. /videos/mi-video.mp4)"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
          />
          {uploading ? <span className="hint">Subiendo video...</span> : null}
          {error ? <span className="form-error">{error}</span> : null}
          <span className="hint">Si se agrega, reemplaza la foto por el video en la tienda.</span>
        </div>
      </div>
    </div>
  );
}

function AddPerfumeForm() {
  // La key fuerza un remontaje completo del formulario (incluida la imagen)
  // después de un guardado exitoso, para dejarlo limpio y listo para el siguiente.
  const [formKey, setFormKey] = useState(0);
  return <AddPerfumeFormFields key={formKey} onSaved={() => setFormKey((key) => key + 1)} />;
}

function AddPerfumeFormFields({ onSaved }) {
  const [state, formAction] = useActionState(addPerfumeAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Agregar perfume</h2>
      <label>
        Nombre
        <input name="name" type="text" required />
      </label>
      <label>
        Precio (S/)
        <input name="price" type="number" step="0.01" min="0" required />
      </label>
      <ImageField />
      <VideoField />
      <label>
        Detalle
        <textarea name="description" rows={3} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton label="Agregar perfume" pendingLabel="Guardando..." />
    </form>
  );
}

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
        Precio (S/)
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={perfume.price}
          required
        />
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
        <span>S/ {Number(perfume.price).toFixed(2)}</span>
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

export default function AdminDashboard({ perfumes }) {
  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Panel de administración — Alvian</h1>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">
            Cerrar sesión
          </button>
        </form>
      </header>

      <a href="/" className="back-link">
        ← Ver sitio público
      </a>

      <AddPerfumeForm />

      <section>
        <h2>Perfumes registrados ({perfumes.length})</h2>
        {perfumes.length === 0 ? (
          <p>Todavía no hay perfumes. Agrega el primero arriba.</p>
        ) : (
          <ul className="perfume-list">
            {perfumes.map((perfume) => (
              <PerfumeRow key={perfume.id} perfume={perfume} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
