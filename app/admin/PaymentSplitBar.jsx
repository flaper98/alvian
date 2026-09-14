// Part-to-whole, 2-category nominal — validated categorical pair (teal-green /
// gold-dark), always paired with a direct-labeled legend since color alone
// never carries identity here.
export default function PaymentSplitBar({ contadoCount, creditoCount, contadoTotal, creditoTotal }) {
  const total = contadoCount + creditoCount;
  if (total === 0) return null;

  const contadoPct = (contadoCount / total) * 100;
  const creditoPct = 100 - contadoPct;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Ventas: contado vs crédito</h3>
      <div className="split-bar" role="img" aria-label={`${contadoCount} ventas al contado, ${creditoCount} a crédito`}>
        {contadoPct > 0 ? (
          <span className="split-bar-segment split-bar-contado" style={{ width: `${contadoPct}%` }} />
        ) : null}
        {creditoPct > 0 ? (
          <span className="split-bar-segment split-bar-credito" style={{ width: `${creditoPct}%` }} />
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
      </ul>
    </div>
  );
}
