import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { getBoutiqueBoard } from '@/lib/db';
import { BoutiqueControl, PriceSimulator } from './BoutiqueBoard';

export const dynamic = 'force-dynamic';

const VIEWS = { control: 'Control', precios: 'Simulador de precios' };

export default async function BoutiquePage({ searchParams }) {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let board;
  try {
    board = await getBoutiqueBoard();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Boutique</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const { vista } = await searchParams;
  // Mientras no dejes nada en la boutique, lo útil es el simulador.
  const view = VIEWS[vista] ? vista : board.moves.length ? 'control' : 'precios';

  return (
    <section className="admin-section reports boutique-page">
      <div className="admin-header">
        <h1>{board.config.name}</h1>
      </div>
      <p className="hint">
        Perfumes a consignación: la boutique se queda con el {board.config.feePercent}% de cada venta. Lo que dejas
        ahí sale de tu stock de la web, y lo que vende entra a tus reportes con su ganancia real.
      </p>
      <nav className="filter-chips" aria-label="Vista">
        {Object.entries(VIEWS).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/boutique?vista=${key}`}
            className={`filter-chip${key === view ? ' active' : ''}`}
            aria-current={key === view ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {view === 'precios' ? (
        <PriceSimulator
          catalog={board.catalog}
          config={board.config}
          rates={board.rates}
          rounding={board.rounding}
        />
      ) : (
        <BoutiqueControl board={board} />
      )}
    </section>
  );
}
