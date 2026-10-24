import { getCurrentRole } from '@/lib/session';
import { listPerfumes, listPanderoGroups } from '@/lib/db';
import PanderoGroupFormModal from './PanderoGroupFormModal';
import PanderoGroupCard from './PanderoGroupCard';

export const dynamic = 'force-dynamic';

// turn_date es una fecha pura: viene como medianoche UTC.
const isoDay = (value) => new Date(value).toISOString().slice(0, 10);

export default async function PanderosPage() {
  const role = await getCurrentRole();
  if (!['admin', 'vendedora'].includes(role)) {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let perfumes;
  let groups;
  try {
    [perfumes, groups] = await Promise.all([listPerfumes(), listPanderoGroups()]);
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Panderos</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const pending = groups.flatMap((g) => g.entries.filter((e) => !e.fulfilled).map((e) => ({ ...e, groupName: g.name })));
  const active = groups.filter((g) => g.entries.some((e) => !e.fulfilled));
  const dueToday = pending.filter((e) => isoDay(e.turn_date) <= today);
  const intervals = [...new Set(active.map((g) => g.interval_days))];

  // Cuántas entregas pendientes hay de cada perfume (en todos los panderos) frente a su stock.
  const pendingByPerfume = {};
  for (const e of pending) {
    const item = pendingByPerfume[e.perfume_id] || { name: e.perfume_name, stock: Number(e.perfume_stock), count: 0 };
    item.count += 1;
    pendingByPerfume[e.perfume_id] = item;
  }
  const shortages = Object.values(pendingByPerfume).filter((p) => p.count > p.stock);

  return (
    <section className="admin-section panderos-page">
      <div className="admin-header">
        <div>
          <h1>Panderos</h1>
          <p className="dist-lead">La lista de cada pandero: quién va en cada turno, qué perfume le toca y cuándo.</p>
        </div>
        <PanderoGroupFormModal />
      </div>

      <div className="credits-kpis">
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Panderos activos</span>
          <strong>{active.length}</strong>
          <small>
            {intervals.length === 1 ? `Cada ${intervals[0]} día${intervals[0] === 1 ? '' : 's'}` : 'Con turnos por entregar'}
          </small>
        </div>
        <div className="dist-card dist-kpi">
          <span className="dist-eyebrow">Entregas pendientes</span>
          <strong>{pending.length}</strong>
          <small>Entre todos los panderos</small>
        </div>
        <div className={`dist-card dist-kpi${dueToday.length ? ' is-dark' : ''}`}>
          <span className="dist-eyebrow">Toca hoy</span>
          <strong>{dueToday.length}</strong>
          <small>
            {dueToday.length
              ? dueToday
                  .slice(0, 2)
                  .map((e) => `${e.perfume_name} · ${e.groupName}`)
                  .join(' / ') + (dueToday.length > 2 ? ` y ${dueToday.length - 2} más` : '')
              : 'Nadie hoy'}
          </small>
        </div>
      </div>

      {shortages.length ? (
        <div className="pandero-alert" role="alert">
          <strong>Ojo con el stock</strong>
          {shortages.map((s) => (
            <span key={s.name}>
              {s.name}: te tocan {s.count} entrega{s.count === 1 ? '' : 's'} y {s.stock < 1 ? 'no tienes stock' : `solo tienes ${s.stock} en stock`}.
            </span>
          ))}
        </div>
      ) : null}

      <p className="pandero-note">Esto es distinto de «Crédito / Pandero», que sirve para cobrar lo ya vendido.</p>

      {groups.length === 0 ? (
        <p className="hint">Todavía no has creado ningún pandero.</p>
      ) : (
        groups.map((group) => (
          <PanderoGroupCard
            key={group.id}
            group={group}
            perfumes={perfumes}
            today={today}
            pendingByPerfume={pendingByPerfume}
          />
        ))
      )}
    </section>
  );
}
