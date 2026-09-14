// Part-to-whole, 3-category nominal — categorical set (teal-green / gold-dark /
// plum), always paired with a direct-labeled legend since color alone never
// carries identity here.
export default function PaymentSplitBar({
  contadoCount,
  creditoCount,
  panderoCount,
  contadoTotal,
  creditoTotal,
  panderoTotal,
}) {
  const total = contadoCount + creditoCount + panderoCount;
  if (total === 0) return null;

  const contadoPct = (contadoCount / total) * 100;
  const creditoPct = (creditoCount / total) * 100;
  const panderoPct = 100 - contadoPct - creditoPct;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Ventas: contado vs crédito vs pandero</h3>
      <div
        className="split-bar"
        role="img"
        aria-label={`${contadoCount} ventas al contado, ${creditoCount} a crédito, ${panderoCount} a pandero`}
      >
        {contadoPct > 0 ? (
          <span className="split-bar-segment split-bar-contado" style={{ width: `${contadoPct}%` }} />
        ) : null}
        {creditoPct > 0 ? (
          <span className="split-bar-segment split-bar-credito" style={{ width: `${creditoPct}%` }} />
        ) : null}
        {panderoPct > 0 ? (
          <span className="split-bar-segment split-bar-pandero" style={{ width: `${panderoPct}%` }} />
        ) : null}
      </div>
      <ul className="split-bar-legend">
        <li>
          <span className="legend-dot legend-dot-contado" />
          Contado — {contadoCount} venta{contadoCount === 1 ? '' : 's'} · S/{' '}
          {Number(contadoTotal).toFixed(2)}
        </li>
        <li>
          <span className="legend-dot legend-dot-credito" />
          Crédito — {creditoCount} venta{creditoCount === 1 ? '' : 's'} · S/{' '}
          {Number(creditoTotal).toFixed(2)}
        </li>
        <li>
          <span className="legend-dot legend-dot-pandero" />
          Pandero — {panderoCount} venta{panderoCount === 1 ? '' : 's'} · S/{' '}
          {Number(panderoTotal).toFixed(2)}
        </li>
      </ul>
    </div>
  );
}
