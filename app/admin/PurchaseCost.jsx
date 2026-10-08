// Precio de compra de un perfume, igual en todo el panel (Catálogo, edición, ventas).
// `cost` viene de listPurchaseCosts(): promedio y última compra, o el precio del proveedor.

const soles = (value) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' });

/** Texto corto: "Compra S/ 90.00" (promedio), o "Proveedor S/ 85.00" si nunca lo compraste. */
export function purchaseCostLabel(cost) {
  if (cost?.avgCost != null) return `Compra ${soles(cost.avgCost)}`;
  if (cost?.supplier) return `Proveedor ${soles(cost.supplier.price)}`;
  return 'Sin precio de compra';
}

/** Detalle: promedio, última compra (costo, fecha, nota) y unidades compradas. */
export default function PurchaseCost({ cost, compact = false }) {
  if (cost?.avgCost == null) {
    return cost?.supplier ? (
      <span className="purchase-cost">
        <strong>{soles(cost.supplier.price)}</strong>
        <span className="report-sub">
          Aún no lo compras · {cost.supplier.name} ({cost.supplier.tier})
        </span>
      </span>
    ) : (
      <span className="purchase-cost purchase-cost-none">Sin compras</span>
    );
  }
  const changed = cost.lastCost != null && Math.abs(cost.lastCost - cost.avgCost) >= 0.01;
  return (
    <span className="purchase-cost">
      <strong>{soles(cost.avgCost)}</strong>
      {compact ? null : (
        <span className="report-sub">
          {changed ? `Última: ${soles(cost.lastCost)} · ` : ''}
          {cost.lastDate ? dateFmt.format(new Date(cost.lastDate)) : ''}
          {cost.lastNote ? ` · ${cost.lastNote}` : ''} · {cost.units} unid. compradas
        </span>
      )}
    </span>
  );
}
