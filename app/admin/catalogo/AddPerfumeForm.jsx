'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { upload } from '@vercel/blob/client';
import { addPerfumeAction } from '@/lib/actions';

export function SubmitButton({ label, pendingLabel }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ImageField({ defaultValue, label = 'Imagen del perfume' }) {
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
      <label>{label}</label>
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

export function VideoField({ defaultValue }) {
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
          <video src={videoUrl} className="image-preview" muted loop autoPlay playsInline />
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

function AddPerfumeFormFields({ prefillName, onSaved }) {
  const [state, formAction] = useActionState(addPerfumeAction, { error: null });

  useEffect(() => {
    if (state?.success) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="perfume-form">
      <h2>Agregar perfume</h2>
      {prefillName ? (
        <p className="hint">
          Precargado desde Proveedores: tu proveedor ofrece &quot;{prefillName}&quot; y todavía no
          está en tu catálogo.
        </p>
      ) : null}
      <label>
        Nombre
        <input name="name" type="text" defaultValue={prefillName || ''} required />
      </label>
      <label>
        Precio de venta (S/) — opcional
        <input name="price" type="number" step="0.01" min="0" placeholder="0.00" />
      </label>
      <label>
        Categoría
        <select name="category" defaultValue="">
          <option value="">Sin especificar</option>
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
          <option value="unisex">Unisex</option>
        </select>
      </label>
      <ImageField />
      <VideoField />
      <label>
        Detalle
        <textarea name="description" rows={3} />
      </label>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <SubmitButton label="Agregar perfume" pendingLabel="Guardando..." />
      <p className="hint">
        Puedes dejar el precio en blanco: se calcula solo cuando registres la primera compra
        (costo + ganancia) en la sección Compras. El stock inicial es 0.
      </p>
    </form>
  );
}

export default function AddPerfumeForm({ prefillName, onSaved }) {
  // La key fuerza un remontaje completo del formulario (incluida la imagen)
  // después de un guardado exitoso, para dejarlo limpio y listo para el siguiente.
  const [formKey, setFormKey] = useState(0);
  return (
    <AddPerfumeFormFields
      key={formKey}
      prefillName={formKey === 0 ? prefillName : ''}
      onSaved={() => {
        setFormKey((key) => key + 1);
        onSaved?.();
      }}
    />
  );
}
