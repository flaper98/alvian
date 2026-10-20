'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SERIES = [
  { key: 'income', label: 'Ingresos', color: 'var(--series-in)' },
  { key: 'outflow', label: 'Salidas', color: 'var(--series-out)' },
];

const MARGIN = { top: 12, right: 12, bottom: 28, left: 64 };
const PLOT_HEIGHT = 220;

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const axisSoles = (value) => `S/ ${Number(value).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;

/** Tope "redondo" del eje y paso entre marcas (1, 2, 2.5 o 5 × 10ⁿ). */
function niceScale(max) {
  if (max <= 0) return { top: 100, step: 25 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough);
  return { top: Math.ceil(max / step) * step, step };
}

/** Barra con esquinas superiores redondeadas (4px) y base recta. */
function barPath(x, y, w, h) {
  if (h <= 0) return null;
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Días que abarca una barra: el día, su semana, el mes completo ('2026-09' → 1 al 30) o el año. */
function bucketDays(key, granularity) {
  if (granularity === 'day' || granularity === 'dia') return [key, key];
  if (granularity === 'anio') return [`${key}-01-01`, `${key}-12-31`];
  if (granularity === 'semana') {
    const [y, m, d] = key.split('-').map(Number);
    return [key, new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10)];
  }
  const [y, m] = key.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${key}-01`, `${key}-${String(last).padStart(2, '0')}`];
}

/**
 * Barras de ingresos y salidas (o las series que se pasen). Con `drillHref`,
 * tocar una barra abre el detalle de ese día, semana, mes o año. `countKey`
 * suma al tooltip un conteo (ej. pedidos) y `totalLabel` la resta de las dos series.
 */
export default function TrendChart({
  buckets,
  granularity,
  drillHref = null,
  series = SERIES,
  countKey = null,
  countLabel = '',
  totalLabel = 'Resultado',
  emptyText = 'No hubo ingresos ni salidas con fecha en este período.',
  detailText = 'Toca para ver los movimientos',
}) {
  const [first, second] = series;
  const isDaily = granularity === 'day' || granularity === 'dia';
  const router = useRouter();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !('ResizeObserver' in window)) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasData = buckets.some((b) => series.some((s) => b[s.key] > 0));
  const n = buckets.length;
  const minGroup = isDaily ? 20 : 52;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, n * minGroup);
  const svgWidth = plotWidth + MARGIN.left + MARGIN.right;
  const svgHeight = PLOT_HEIGHT + MARGIN.top + MARGIN.bottom;
  const groupW = n > 0 ? plotWidth / n : plotWidth;
  const barW = Math.min(24, Math.max(3, (groupW - 12) / 2));
  const { top, step } = niceScale(Math.max(...buckets.map((b) => Math.max(...series.map((s) => b[s.key]))), 0));
  const y = (value) => MARGIN.top + PLOT_HEIGHT - (value / top) * PLOT_HEIGHT;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const labelEvery = Math.max(1, Math.ceil((isDaily ? 26 : 56) / groupW));

  const activeBucket = active != null ? buckets[active] : null;
  const detailHref = (b) => {
    const [desde, hasta] = bucketDays(b.key, granularity);
    return `${drillHref}&desde=${desde}&hasta=${hasta}`;
  };
  const describe = (b) => {
    const parts = series.map((s) => `${s.label.toLowerCase()} ${soles(b[s.key])}`);
    if (countKey) parts.push(`${b[countKey]} ${countLabel}`);
    return parts.join(', ');
  };
  const tooltipLeft =
    active != null ? Math.min(Math.max(MARGIN.left + groupW * (active + 0.5), 90), svgWidth - 90) : 0;

  return (
    <div className="trend-chart">
      <ul className="chart-legend" aria-label="Leyenda">
        {series.map((s) => (
          <li key={s.key}>
            <span className="chart-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>

      {!hasData ? (
        <p className="hint">{emptyText}</p>
      ) : (
        <div className="trend-chart-scroll" ref={wrapRef}>
          <div className="trend-chart-canvas" style={{ width: svgWidth }}>
            <svg width={svgWidth} height={svgHeight} role="img" aria-label={`${series.map((s) => s.label).join(' y ')} por período`}>
              {ticks.map((v) => (
                <g key={v}>
                  <line className="chart-grid-line" x1={MARGIN.left} x2={svgWidth - MARGIN.right} y1={y(v)} y2={y(v)} />
                  <text className="chart-axis-text" x={MARGIN.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
                    {axisSoles(v)}
                  </text>
                </g>
              ))}

              {buckets.map((b, i) => {
                const gx = MARGIN.left + i * groupW;
                const pairX = gx + (groupW - (barW * 2 + 2)) / 2;
                return (
                  <g key={b.key}>
                    {active === i ? (
                      <rect className="chart-hover-wash" x={gx} y={MARGIN.top} width={groupW} height={PLOT_HEIGHT} />
                    ) : null}
                    {series.map((s, si) => {
                      const value = b[s.key];
                      const d = barPath(pairX + si * (barW + 2), y(value), barW, y(0) - y(value));
                      return d ? <path key={s.key} d={d} fill={s.color} /> : null;
                    })}
                    {i % labelEvery === 0 ? (
                      <text className="chart-axis-text" x={gx + groupW / 2} y={svgHeight - 8} textAnchor="middle">
                        {b.label}
                      </text>
                    ) : null}
                    <rect
                      className="chart-hit"
                      x={gx}
                      y={MARGIN.top}
                      width={groupW}
                      height={PLOT_HEIGHT}
                      tabIndex={0}
                      role={drillHref ? 'link' : undefined}
                      style={drillHref ? { cursor: 'pointer' } : undefined}
                      onClick={drillHref ? () => router.push(detailHref(b)) : undefined}
                      onKeyDown={
                        drillHref
                          ? (event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                router.push(detailHref(b));
                              }
                            }
                          : undefined
                      }
                      aria-label={`${b.fullLabel}: ${describe(b)}${drillHref ? '. Ver detalle' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                    />
                  </g>
                );
              })}
              <line className="chart-baseline" x1={MARGIN.left} x2={svgWidth - MARGIN.right} y1={y(0)} y2={y(0)} />
            </svg>

            {activeBucket ? (
              <div className="chart-tooltip" style={{ left: tooltipLeft }} role="status">
                <span className="chart-tooltip-title">{activeBucket.fullLabel}</span>
                {series.map((s) => (
                  <span key={s.key} className="chart-tooltip-row">
                    <span className="chart-tooltip-key" style={{ background: s.color }} />
                    <strong>{soles(activeBucket[s.key])}</strong>
                    <span>{s.label}</span>
                  </span>
                ))}
                {countKey ? (
                  <span className="chart-tooltip-row chart-tooltip-total">
                    <strong>{activeBucket[countKey]}</strong>
                    <span>{countLabel}</span>
                  </span>
                ) : null}
                {totalLabel ? (
                  <span className="chart-tooltip-row chart-tooltip-total">
                    <strong>{soles(activeBucket[first.key] - activeBucket[second.key])}</strong>
                    <span>{totalLabel}</span>
                  </span>
                ) : null}
                {drillHref ? <span className="chart-tooltip-hint">{detailText}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {hasData ? (
        <details className="chart-table">
          <summary>Ver como tabla</summary>
          <div className="chart-table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{{ day: 'Día', dia: 'Día', semana: 'Semana', anio: 'Año' }[granularity] || 'Mes'}</th>
                  {series.map((s) => (
                    <th scope="col" key={s.key}>
                      {s.label}
                    </th>
                  ))}
                  {countKey ? <th scope="col">{countLabel}</th> : null}
                  {totalLabel ? <th scope="col">{totalLabel}</th> : null}
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr key={b.key}>
                    <th scope="row">{drillHref ? <Link href={detailHref(b)}>{b.fullLabel}</Link> : b.fullLabel}</th>
                    {series.map((s) => (
                      <td key={s.key} className={b[s.key] < 0 ? 'text-critical' : ''}>
                        {soles(b[s.key])}
                      </td>
                    ))}
                    {countKey ? <td>{b[countKey]}</td> : null}
                    {totalLabel ? (
                      <td className={b[first.key] - b[second.key] < 0 ? 'text-critical' : ''}>
                        {soles(b[first.key] - b[second.key])}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
