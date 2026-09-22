'use client';

import { useState, useTransition } from 'react';
import {
  setHeroBannerActiveAction,
  deleteHeroBannerAction,
  moveHeroBannerAction,
} from '@/lib/actions';
import EditBannerModal from './EditBannerModal';

function BannerRow({ banner, perfumes, isFirst, isLast }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function toggleActive() {
    startTransition(async () => {
      const result = await setHeroBannerActiveAction(banner.id, !banner.active);
      if (result?.error) alert(result.error);
    });
  }

  function move(direction) {
    startTransition(async () => {
      const result = await moveHeroBannerAction(banner.id, direction);
      if (result?.error) alert(result.error);
    });
  }

  function handleDelete() {
    if (!confirm('¿Eliminar este banner?')) return;
    startTransition(async () => {
      const result = await deleteHeroBannerAction(banner.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <>
      <tr className="perfume-table-row">
        <td className="perfume-table-image-cell">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.image_url} alt={banner.alt_text} className="perfume-table-image" />
        </td>
        <td>
          <strong>{banner.alt_text}</strong>
          {banner.link_url ? <p className="perfume-table-description">Enlace: {banner.link_url}</p> : null}
        </td>
        <td>
          <span className={`badge ${banner.active ? 'badge-paid' : 'badge-pending'}`}>
            {banner.active ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => move('up')} disabled={isPending || isFirst}>
            ↑
          </button>
          <button type="button" className="btn-secondary" onClick={() => move('down')} disabled={isPending || isLast}>
            ↓
          </button>
        </td>
        <td className="perfume-table-actions-cell">
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)} disabled={isPending}>
            Editar
          </button>
          <button type="button" className="btn-secondary" onClick={toggleActive} disabled={isPending}>
            {banner.active ? 'Desactivar' : 'Activar'}
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete} disabled={isPending}>
            Eliminar
          </button>
        </td>
      </tr>
      {editing ? (
        <EditBannerModal banner={banner} perfumes={perfumes} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}

export default function BannersList({ banners, perfumes }) {
  if (banners.length === 0) {
    return <p>Todavía no hay banners. Agrega el primero arriba.</p>;
  }

  return (
    <div className="perfume-table-wrap">
      <table className="perfume-table">
        <thead>
          <tr>
            <th scope="col">Imagen</th>
            <th scope="col">Descripción</th>
            <th scope="col">Estado</th>
            <th scope="col">Orden</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {banners.map((banner, index) => (
            <BannerRow
              key={banner.id}
              banner={banner}
              perfumes={perfumes}
              isFirst={index === 0}
              isLast={index === banners.length - 1}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
