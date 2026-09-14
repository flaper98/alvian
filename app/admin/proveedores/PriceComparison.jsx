export default function PriceComparison({ comparison }) {
  if (comparison.length === 0) {
    return <p>Todavía no hay precios registrados para comparar.</p>;
  }

  return (
    <ul className="history-list">
      {comparison.map((row) => {
        const cheapest = row.options[0];
        return (
          <li key={row.perfumeId} className="history-row comparison-row">
            <div>
              <strong>{row.perfumeName}</strong>
              <ul className="comparison-options">
                {row.options.map((option, index) => (
                  <li key={option.id} className={index === 0 ? 'comparison-best' : ''}>
                    {index === 0 ? '🏆 ' : ''}
                    {option.supplierName} · {option.tierLabel}: <strong>S/ {Number(option.price).toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <span className="badge badge-paid">
              Mejor: {cheapest.supplierName} (S/ {Number(cheapest.price).toFixed(2)})
            </span>
          </li>
        );
      })}
    </ul>
  );
}
