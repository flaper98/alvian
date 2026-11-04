'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPercent, formatSoles } from '@/lib/money.mjs';

// Gráficos del Resumen: ganancia por mes (línea) y ventas, gastos y ganancia
// por mes (barras agrupadas). Mismo estilo que TrendChart, pero con eje que
// admite valores negativos (un mes con pérdida).

const MARGIN = { top: 16, right: 16, bottom: 28, left: 72 };
const PLOT_HEIGHT = 230;
const MIN_COLUMN = 56;

export const PROFIT_SERIES = [
  { key: 'revenue', label: 'Ventas', color: 'var(--series-in)' },
  { key: 'expenses', label: 'Gastos', color: 'var(--series-out)' },
  { key: 'profit', label: 'Ganancia', color: 'var(--series-contado)' },
];

const axisSoles = (value) => formatSoles(value, { round: true });

/** Eje "redondo" de min a max (incluye el 0), con 4–5 marcas. */
function niceAxis(min, max) {
  const low = Math.min(0, min);
  const high = Math.max(0, max);
  const span = high - low || 100;
  const rough = span / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough);
  const top = high > 0 ? Math.ceil(high / step) * step : 0;
  const bottom = low < 0 ? Math.floor(low / step) * step : 0;
  const ticks = [];
  for (let v = bottom; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 100) / 100);
  return { top: top === bottom ? step : top, bottom, ticks };
}

/** Rectángulo con las esquinas redondeadas solo en el extremo del dato (no en la base). */
function barPath(x, y0, y1, w) {
  const h = Math.abs(y1 - y0);
  if (h < 0.5) return null;
  const r = Math.min(4, w / 2, h);
  if (y1 < y0) {
    // Hacia arriba: base abajo (y0), extremo arriba (y1).
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 + r}V${y0}Z`;
  }
  // Hacia abajo (negativo): base arriba (y0), extremo abajo (y1).
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('ResizeObserver' in window)) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function monthLabels(key) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, 15));
  return {
    short: `${date.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).replace('.', '')} ${String(y).slice(2)}`,
    full: date.toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

function Tooltip({ month, left }) {
  const { full } = monthLabels(month.key);
  return (
    <div className="chart-tooltip profit-tooltip" style={{ left }} role="status">
      <span className="chart-tooltip-title">{full}</span>
      {PROFIT_SERIES.map((s) => (
        <span key={s.key} className="chart-tooltip-row">
          <span className="chart-tooltip-key" style={{ background: s.color }} />
          <span>{s.label}:</span>
          <strong>{formatSoles(month[s.key])}</strong>
        </span>
      ))}
      <span className="chart-tooltip-row chart-tooltip-total">
        <span>Margen:</span>
        <strong>{formatPercent(month.margin)}</strong>
      </span>
    </div>
  );
}

function ChartTable({ months }) {
  return (
    <details className="chart-table">
      <summary>Ver como tabla</summary>
      <div className="chart-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              {PROFIT_SERIES.map((s) => (
                <th scope="col" key={s.key}>
                  {s.label}
                </th>
              ))}
              <th scope="col">Margen</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <th scope="row">{monthLabels(m.key).full}</th>
                {PROFIT_SERIES.map((s) => (
                  <td key={s.key} className={m[s.key] < 0 ? 'text-critical' : ''}>
                    {formatSoles(m[s.key])}
                  </td>
                ))}
                <td>{formatPercent(m.margin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Marco común: escala, ejes, columnas por mes y tooltip al pasar el mouse o con el teclado. */
function MonthChart({ months, keys, ariaLabel, children }) {
  const [wrapRef, width] = useWidth();
  const [active, setActive] = useState(null);
  const n = months.length;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, n * MIN_COLUMN);
  const svgWidth = plotWidth + MARGIN.left + MARGIN.right;
  const svgHeight = PLOT_HEIGHT + MARGIN.top + MARGIN.bottom;
  const column = n > 0 ? plotWidth / n : plotWidth;
  const values = months.flatMap((m) => keys.map((k) => Number(m[k]) || 0));
  const { top, bottom, ticks } = niceAxis(Math.min(...values, 0), Math.max(...values, 0));
  const y = (value) => MARGIN.top + ((top - value) / (top - bottom)) * PLOT_HEIGHT;
  const labelEvery = Math.max(1, Math.ceil(60 / column));
  const tooltipLeft = active != null ? Math.min(Math.max(MARGIN.left + column * (active + 0.5), 100), svgWidth - 100) : 0;

  return (
    <div className="trend-chart-scroll" ref={wrapRef}>
      <div className="trend-chart-canvas" style={{ width: svgWidth }}>
        <svg width={svgWidth} height={svgHeight} role="img" aria-label={ariaLabel}>
          {ticks.map((v) => (
            <g key={v}>
              <line
                className={v === 0 ? 'chart-baseline' : 'chart-grid-line'}
                x1={MARGIN.left}
                x2={svgWidth - MARGIN.right}
                y1={y(v)}
                y2={y(v)}
              />
              <text className="chart-axis-text" x={MARGIN.left - 8} y={y(v)} dy="0.32em" textAnchor="end">
                {axisSoles(v)}
              </text>
            </g>
          ))}
          {months.map((m, i) => {
            const x = MARGIN.left + i * column;
            return (
              <g key={m.key}>
                {/* El período elegido se marca con un fondo; los otros meses dan contexto. */}
                {m.selected ? (
                  <rect className="profit-selected" x={x} y={MARGIN.top} width={column} height={PLOT_HEIGHT} />
                ) : null}
                {active === i ? <rect className="chart-hover-wash" x={x} y={MARGIN.top} width={column} height={PLOT_HEIGHT} /> : null}
                {i % labelEvery === 0 || i === n - 1 ? (
                  <text
                    className={`chart-axis-text${m.selected ? ' profit-axis-selected' : ''}`}
                    x={x + column / 2}
                    y={svgHeight - 8}
                    textAnchor="middle"
                  >
                    {monthLabels(m.key).short}
                  </text>
                ) : null}
              </g>
            );
          })}
          {children({ y, column, active })}
          {months.map((m, i) => (
            <rect
              key={m.key}
              className="chart-hit"
              x={MARGIN.left + i * column}
              y={MARGIN.top}
              width={column}
              height={PLOT_HEIGHT}
              tabIndex={0}
              aria-label={`${monthLabels(m.key).full}: ventas ${formatSoles(m.revenue)}, gastos ${formatSoles(m.expenses)}, ganancia ${formatSoles(m.profit)}, margen ${formatPercent(m.margin)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>
        {active != null ? <Tooltip month={months[active]} left={tooltipLeft} /> : null}
      </div>
    </div>
  );
}

const hasData = (months) => months.some((m) => m.revenue !== 0 || m.expenses !== 0);

/** Ganancia neta de cada mes: una línea, con el valor del último mes escrito. */
export function ProfitLineChart({ months }) {
  if (!hasData(months)) return <p className="hint">No hay ventas ni gastos registrados en estos meses.</p>;
  const color = 'var(--series-contado)';
  return (
    <div className="trend-chart">
      <MonthChart months={months} keys={['profit']} ariaLabel="Ganancia neta por mes">
        {({ y, column, active }) => {
          const points = months.map((m, i) => ({ x: MARGIN.left + column * (i + 0.5), y: y(m.profit), m }));
          const last = points.at(-1);
          return (
            <g>
              {active != null ? (
                <line
                  className="profit-crosshair"
                  x1={points[active].x}
                  x2={points[active].x}
                  y1={MARGIN.top}
                  y2={MARGIN.top + PLOT_HEIGHT}
                />
              ) : null}
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle
                  key={p.m.key}
                  cx={p.x}
                  cy={p.y}
                  r={active === i ? 5 : 4}
                  fill={p.m.profit < 0 ? 'var(--status-critical)' : color}
                  stroke="var(--cream-soft)"
                  strokeWidth="2"
                />
              ))}
              <text className="profit-direct-label" x={last.x} y={last.y - 12} textAnchor="middle">
                {formatSoles(last.m.profit, { round: true })}
              </text>
            </g>
          );
        }}
      </MonthChart>
      <ChartTable months={months} />
    </div>
  );
}

/** Ventas, gastos y ganancia de cada mes, lado a lado. */
export function MonthlyBarsChart({ months }) {
  if (!hasData(months)) return <p className="hint">No hay ventas ni gastos registrados en estos meses.</p>;
  return (
    <div className="trend-chart">
      <ul className="chart-legend" aria-label="Leyenda">
        {PROFIT_SERIES.map((s) => (
          <li key={s.key}>
            <span className="chart-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <MonthChart months={months} keys={PROFIT_SERIES.map((s) => s.key)} ariaLabel="Ventas, gastos y ganancia por mes">
        {({ y, column }) => {
          const gap = 2;
          const barW = Math.min(22, Math.max(4, (column - 16 - gap * 2) / 3));
          const groupW = barW * 3 + gap * 2;
          return (
            <g>
              {months.map((m, i) => {
                const x0 = MARGIN.left + i * column + (column - groupW) / 2;
                return PROFIT_SERIES.map((s, si) => {
                  const d = barPath(x0 + si * (barW + gap), y(0), y(Number(m[s.key]) || 0), barW);
                  return d ? <path key={`${m.key}-${s.key}`} d={d} fill={s.color} /> : null;
                });
              })}
            </g>
          );
        }}
      </MonthChart>
      <ChartTable months={months} />
    </div>
  );
}
