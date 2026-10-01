'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { addMissingSupplierProductsAction } from '@/lib/actions';
import { bestWholesaleOption, catalogName, salePrice } from '@/lib/supplier-pricing';
import { findPerfumeInfo } from '@/lib/perfume-info';

const CATEGORY_LABELS = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };

const DEFAULT_MARGIN = 50;
const soles = (value) => `S/ ${Number(value).toFixed(2)}`;

function SubmitButton({ count }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || count === 0}>
      {pending ? 'Guardando…' : `Guardar ${count} cambio${count === 1 ? '' : 's'}`}
    </button>
  );
}

/**
 * Botón + vista previa para agregar al catálogo todos los perfumes de los
 * proveedores que todavía no tienes, con precio = mejor precio por mayor + ganancia.
 */
export default function AddMissingToCatalog({ comparison, catalogPrices }) {
  const [open, setOpen] = useState(false);
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [state, formAction] = useActionState(addMissingSupplierProductsAction, { error: null });

  const preview = useMemo(() => {
    const m = Number(margin) || 0;
    const create = [];
    const update = [];
    for (const row of comparison) {
      const best = bestWholesaleOption(row.options, 'mayor');
      if (!best) continue;
      const item = { key: row.perfumeId ?? row.perfumeName, best, price: salePrice(best.price, m) };
      if (row.unlinked) {
        create.push({ ...item, name: catalogName(row.perfumeName), info: findPerfumeInfo(row.perfumeName) || {} });
      } else {
        const current = Number(catalogPrices[row.perfumeId] ?? 0);
        if (current !== item.price) update.push({ ...item, name: row.perfumeName, current });
      }
    }
    create.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    update.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return { create, update };
  }, [comparison, catalogPrices, margin]);

  const missingCount = comparison.filter((row) => row.unlinked).length;
  const changes = preview.create.length + (updateExisting ? preview.update.length : 0);
  const done = state?.success && state.result;

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)} disabled={missingCount === 0}>
        + Agregar {missingCount} al catálogo
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal-dialog modal-dialog-prices"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-missing-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Cerrar" onClick={() => setOpen(false)}>
              ×
            </button>
            <div className="perfume-form prices-modal">
              <div>
                <h2 id="add-missing-title">Agregar al catálogo</h2>
                <p className="hint">
                  Precio de venta = mejor precio <strong>por mayor</strong> entre tus proveedores (sin contar el
                  precio por unidad) + tu ganancia.
                </p>
              </div>

              {done ? (
                <div className="bulk-result" role="status">
                  <div className="bulk-result-group bulk-ok">
                    <strong>{done.created}</strong> perfume{done.created === 1 ? '' : 's'} agregado
                    {done.created === 1 ? '' : 's'} al catálogo
                    {done.updated ? (
                      <>
                        {' '}
                        · <strong>{done.updated}</strong> precio{done.updated === 1 ? '' : 's'} actualizado
                        {done.updated === 1 ? '' : 's'}
                      </>
                    ) : null}
                    .
                  </div>
                  {done.completed ? (
                    <div className="bulk-result-group bulk-ok">
                      Se completaron datos vacíos (categoría, marca, notas o descripción) en{' '}
                      <strong>{done.completed}</strong> perfume{done.completed === 1 ? '' : 's'} que ya tenías.
                    </div>
                  ) : null}
                  {done.withoutInfo?.length ? (
                    <details className="bulk-result-group bulk-warn" open>
                      <summary>
                        <strong>{done.withoutInfo.length}</strong> sin ficha publicada: completa sus notas y
                        categoría a mano
                      </summary>
                      <p>{done.withoutInfo.join(' · ')}</p>
                    </details>
                  ) : null}
                  <div className="bulk-result-group bulk-warn">
                    Los nuevos <strong>no se ven en la tienda</strong> hasta que les subas su imagen. Búscalos en
                    Catálogo con el filtro «Sin imagen».
                  </div>
                  <Link href="/admin/catalogo?filtro=sin-imagen" className="btn-primary">
                    Ir a subir imágenes
                  </Link>
                </div>
              ) : (
                <form action={formAction} className="prices-form">
                  <label>
                    Ganancia por perfume (S/)
                    <input
                      name="margin"
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={margin}
                      onChange={(event) => setMargin(event.target.value)}
                      required
                    />
                  </label>

                  <h3 className="report-subtitle">Se agregarán ({preview.create.length})</h3>
                  {preview.create.length === 0 ? (
                    <p className="hint">No falta ningún perfume con precio por mayor.</p>
                  ) : (
                    <div className="pivot-scroll report-scroll-sm">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th scope="col">Perfume</th>
                            <th scope="col" className="num">
                              Costo
                            </th>
                            <th scope="col" className="num">
                              Venta
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.create.map((item) => (
                            <tr key={item.key}>
                              <th scope="row">
                                {item.name}
                                <span className="report-sub">
                                  {[
                                    item.info.brand,
                                    CATEGORY_LABELS[item.info.category],
                                    `${item.best.supplierName} · ${item.best.tierLabel}`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </span>
                                {item.info.notes ? (
                                  <span className="report-sub">Notas: {item.info.notes}</span>
                                ) : (
                                  <span className="report-sub text-critical">Sin ficha: completa notas y categoría a mano</span>
                                )}
                              </th>
                              <td className="num">{soles(item.best.price)}</td>
                              <td className="num">
                                <strong>{soles(item.price)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {preview.update.length > 0 ? (
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        name="updateExisting"
                        checked={updateExisting}
                        onChange={(event) => setUpdateExisting(event.target.checked)}
                      />
                      También recalcular el precio de {preview.update.length} perfume
                      {preview.update.length === 1 ? '' : 's'} que ya tengo
                    </label>
                  ) : null}
                  {updateExisting && preview.update.length > 0 ? (
                    <div className="pivot-scroll report-scroll-sm">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th scope="col">Perfume</th>
                            <th scope="col" className="num">
                              Hoy
                            </th>
                            <th scope="col" className="num">
                              Nuevo
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.update.map((item) => (
                            <tr key={item.key}>
                              <th scope="row">
                                {item.name}
                                <span className="report-sub">
                                  Costo {soles(item.best.price)} · {item.best.supplierName}
                                </span>
                              </th>
                              <td className="num">{soles(item.current)}</td>
                              <td className={`num ${item.price < item.current ? 'text-critical' : 'text-good'}`}>
                                <strong>{soles(item.price)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <p className="hint">
                    Se crean con su categoría, marca, notas y descripción (si hay ficha publicada), pero sin
                    imagen: <strong>no aparecen en la tienda</strong> hasta que les subas su foto. A los que ya
                    tienes solo se les completan los datos que estén vacíos.
                  </p>
                  {state?.error ? <p className="form-error">{state.error}</p> : null}
                  <div className="prices-form-actions">
                    <SubmitButton count={changes} />
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
