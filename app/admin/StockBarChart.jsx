const LOW_STOCK_THRESHOLD = 3;

// Sequential magnitude chart, one hue (--chart-series-1). Bars at/under the
// low-stock threshold switch to the status "critical" token instead — that's
// a state the series legitimately means, not a second identity.
export default function StockBarChart({ perfumes }) {
  if (!perfumes || perfumes.length === 0) return null;

  const max = Math.max(...perfumes.map((perfume) => perfume.stock), 1);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Stock por perfume</h3>
      <ul className="bar-chart">
        {perfumes.map((perfume) => {
          const low = perfume.stock <= LOW_STOCK_THRESHOLD;
          const widthPct = perfume.stock > 0 ? Math.max((perfume.stock / max) * 100, 4) : 0;
          return (
            <li key={perfume.id} className="bar-chart-row">
              <span className="bar-chart-label">{perfume.name}</span>
              <span className="bar-chart-track">
                <span
                  className={`bar-chart-fill${low ? ' bar-chart-fill-low' : ''}`}
                  style={{ width: `${widthPct}%` }}
                />
              </span>
              <span className={`bar-chart-value${low ? ' text-critical' : ''}`}>
                {perfume.stock}
                {low ? ' · bajo' : ''}
              </span>
            </li>
          );
        })}
      </ul>
      <a href="/admin/catalogo" className="chart-footnote">
        Ver catálogo completo →
      </a>
    </div>
  );
}
