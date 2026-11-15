import Link from 'next/link';
import { getSalesComparison } from '@/lib/reports';
import { variation } from '@/lib/dashboard.mjs';
import { formatPercent, formatSoles } from '@/lib/money.mjs';

const TZ = 'America/Lima';
const dayFmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: TZ });
const weekdayFmt = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'long', timeZone: TZ });
const monthYearFmt = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: TZ });

const day = (ms) => dayFmt.format(new Date(ms)).replace('.', '');
const decimal = (n) => n.toLocaleString('es-PE', { maximumFractionDigits: 1 });
const perfumes = (n) => `${decimal(n)} perfume${n === 1 ? '' : 's'}`;
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SERIES = [
  { key: 'mes', label: 'Mes', title: 'Mes a mes (últimos 6 meses)', header: 'Mes' },
  { key: 'semana', label: 'Semana', title: 'Semana a semana (últimas 8 semanas)', header: 'Semana' },
  { key: 'dia', label: 'Día', title: 'Día a día (últimos 14 días)', header: 'Día' },
];

/** "↑ 25.0%" en verde si mejora, "↓" en rojo si empeora; con flecha y texto, nunca solo color. */
function Delta({ current, previous, isMoney = false }) {
  const v = variation(current, previous);
  if (!v) return null;
  if (v.direction === 'flat') return <span className="kpi-delta">→ igual</span>;
  const text = v.ratio == null ? `antes ${isMoney ? formatSoles(previous) : previous}` : formatPercent(Math.abs(v.ratio));
  return (
    <span className={`kpi-delta ${v.direction === 'up' ? 'is-good' : 'is-bad'}`}>
      {v.direction === 'up' ? '↑' : '↓'} {text}
    </span>
  );
}

/** Títulos de cada comparación con las fechas exactas que se comparan. */
function compareText(c, now) {
  const b = c.bounds;
  if (c.kind === 'dia') {
    return {
      title: 'Hoy vs. ayer',
      range: `Hoy hasta las ${timeFmt.format(new Date(now))} · ayer hasta la misma hora`,
      full: 'Ayer completo',
      rhythm: null,
    };
  }
  if (c.kind === 'semana') {
    return {
      title: 'Esta semana vs. la pasada',
      range: `${day(b.start)} – ${day(now)} · vs. ${day(b.prevStart)} – ${day(b.prevSameEnd - 1)}`,
      full: 'La semana pasada completa',
      rhythm: 'la semana',
    };
  }
  return {
    title: 'Este mes vs. el pasado',
    range: `${day(b.start)} – ${day(now)} · vs. ${day(b.prevStart)} – ${day(b.prevSameEnd - 1)}`,
    full: `${capitalize(monthFmt.format(new Date(b.prevStart)))} completo`,
    rhythm: monthFmt.format(new Date(b.start)),
  };
}

function CompareCard({ c, now }) {
  const t = compareText(c, now);
  const { current: cur, previous: prev } = c;
  const rows = [
    { label: 'Ventas', cur: cur.revenue, prev: prev.revenue, isMoney: true },
    { label: 'Ganancia', cur: cur.profit, prev: prev.profit, isMoney: true },
    { label: 'Pedidos', cur: cur.orders, prev: prev.orders },
    { label: 'Ticket promedio', cur: cur.ticket, prev: prev.ticket, isMoney: true },
  ];
  return (
    <article className="cmp-card">
      <header>
        <h3>{t.title}</h3>
        <p className="hint">{t.range}</p>
      </header>
      <div className="cmp-hero">
        <span className="kpi-label">Perfumes vendidos</span>
        <strong>{cur.units.toLocaleString('es-PE')}</strong>
        <span className="cmp-hero-prev">
          antes {prev.units.toLocaleString('es-PE')} <Delta current={cur.units} previous={prev.units} />
        </span>
      </div>
      <dl className="cmp-metrics">
        {rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              <strong>{r.isMoney ? formatSoles(r.cur) : r.cur}</strong>
              <span>
                antes {r.isMoney ? formatSoles(r.prev) : r.prev}{' '}
                <Delta current={r.cur} previous={r.prev} isMoney={r.isMoney} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <footer className="cmp-foot">
        <span>
          {t.full}: {perfumes(c.previousFull.units)} · {formatSoles(c.previousFull.revenue)}
        </span>
        {c.projection && t.rhythm ? (
          <span>
            A este ritmo cerrarías {t.rhythm} con <strong>~{perfumes(c.projection.units)}</strong>{' '}
            <span className="cmp-nowrap">(≈ {formatSoles(c.projection.revenue, { round: true })})</span>
          </span>
        ) : null}
      </footer>
    </article>
  );
}

function periodLabel(kind, p) {
  if (kind === 'mes') return capitalize(monthYearFmt.format(new Date(p.start)).replace(' de ', ' '));
  if (kind === 'semana') return `Semana del ${day(p.start)}`;
  return capitalize(weekdayFmt.format(new Date(p.start)).replace('.', ''));
}

/** Tabla de la evolución: cada período contra el anterior (el actual va en curso). */
function SeriesTable({ kind, list }) {
  const info = SERIES.find((s) => s.key === kind);
  const max = Math.max(...list.map((p) => p.units), 0);
  const rows = list.map((p, i) => ({ ...p, before: i > 0 ? list[i - 1] : null })).reverse();
  return (
    <div className="pivot-scroll">
      <table className="report-table cmp-series">
        <thead>
          <tr>
            <th scope="col">{info.header}</th>
            <th scope="col">Perfumes</th>
            <th scope="col" className="num">
              Ventas
            </th>
            <th scope="col" className="num">
              Ganancia
            </th>
            <th scope="col" className="num">
              Pedidos
            </th>
            <th scope="col" className="num">
              Ticket
            </th>
            {kind !== 'dia' ? (
              <th scope="col" className="num" title="Perfumes vendidos por día">
                Por día
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.key} className={p.current ? 'cmp-row-current' : undefined}>
              <th scope="row">
                {periodLabel(kind, p)}
                {p.current ? <span className="cmp-badge">en curso</span> : null}
              </th>
              <td>
                <div className="cmp-units">
                  <span className="cmp-bar" aria-hidden="true">
                    <span style={{ width: `${max > 0 ? (p.units / max) * 100 : 0}%` }} />
                  </span>
                  <strong>{p.units}</strong>
                  {p.before && !p.current ? <Delta current={p.units} previous={p.before.units} /> : null}
                </div>
              </td>
              <td className="num">
                {formatSoles(p.revenue)}
                {p.before && !p.current ? (
                  <>
                    {' '}
                    <Delta current={p.revenue} previous={p.before.revenue} isMoney />
                  </>
                ) : null}
              </td>
              <td className="num">{formatSoles(p.profit)}</td>
              <td className="num">{p.orders}</td>
              <td className="num">{formatSoles(p.ticket)}</td>
              {kind !== 'dia' ? <td className="num">{decimal(p.perDay)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekdayCard({ weekdays }) {
  if (!weekdays.weeks) return null;
  const max = Math.max(...weekdays.days.map((d) => d.units), 0);
  const best = weekdays.days.reduce((top, d) => (d.units > top.units ? d : top), weekdays.days[0]);
  return (
    <div className="chart-card">
      <h3 className="chart-title">¿Qué días vendes más?</h3>
      <p className="hint">
        Promedio de perfumes por día de la semana en las últimas {weekdays.weeks} semanas completas.
        {best.units > 0 ? (
          <>
            {' '}
            Tu mejor día es el <strong>{WEEKDAYS[best.weekday].toLowerCase()}</strong>: {perfumes(best.units)} en promedio.
            Ese día conviene publicar y tener stock.
          </>
        ) : null}
      </p>
      <ul className="bar-list">
        {weekdays.days.map((d) => (
          <li key={d.weekday}>
            <div className="bar-list-head">
              <span>{WEEKDAYS[d.weekday]}</span>
              <strong>{perfumes(d.units)}</strong>
            </div>
            <div className="bar-list-track">
              <span style={{ width: `${max > 0 ? (d.units / max) * 100 : 0}%`, background: 'var(--green-700)' }} />
            </div>
            <span className="bar-list-sub">≈ {formatSoles(d.revenue)} en ventas</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pestaña Comparativo: métricas y comparaciones de ventas por día, semana y mes. */
export default async function CompareTab({ serie }) {
  const now = new Date();
  const data = await getSalesComparison(now);
  const kind = SERIES.some((s) => s.key === serie) ? serie : 'mes';
  const info = SERIES.find((s) => s.key === kind);

  return (
    <>
      <p className="hint">
        Cada comparación es <strong>a la misma altura</strong>: hoy contra ayer hasta la misma hora, esta semana contra
        la pasada hasta el mismo día, y este mes contra el pasado hasta la misma fecha. Así comparas parejo aunque el
        período no haya terminado.
      </p>

      <div className="cmp-grid">
        {['dia', 'semana', 'mes'].map((k) => (
          <CompareCard key={k} c={data.compare[k]} now={data.now} />
        ))}
      </div>

      <div className="chart-card">
        <div className="sales-chart-head">
          <h3 className="chart-title">{info.title}</h3>
          <nav className="filter-chips no-print" aria-label="Ver por">
            {SERIES.map((s) => (
              <Link
                key={s.key}
                href={`/admin/reportes?vista=comparativo&serie=${s.key}`}
                className={`filter-chip${kind === s.key ? ' active' : ''}`}
                aria-current={kind === s.key ? 'page' : undefined}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <SeriesTable kind={kind} list={data.series[kind]} />
        <p className="hint">
          Las flechas comparan cada {info.header.toLowerCase()} con el anterior. El que va en curso no se compara aquí
          porque todavía no termina: míralo arriba, a la misma altura.
        </p>
      </div>

      <WeekdayCard weekdays={data.weekdays} />
    </>
  );
}
