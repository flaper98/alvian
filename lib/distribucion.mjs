// Distribución de ganancias por venta. Lógica pura (sin base de datos) para
// poder probarla con `npm test`.
//
// El dinero se calcula en CÉNTIMOS ENTEROS (JavaScript no tiene BigDecimal):
// así 0.1 + 0.2 nunca da 0.30000000000000004. En la base se guarda NUMERIC.
//
// Orden del cálculo (por venta):
//   precio − costo − comisión − logística − otros − impuesto = UTILIDAD NETA
//   utilidad neta → reinversión % + sueldo % + reserva % (suman 100)

export const DEFAULT_DISTRIBUTION_CONFIG = Object.freeze({
  taxPercent: 0,
  reinvestPercent: 70,
  salaryPercent: 20,
  reservePercent: 10,
  minMarginPercent: 15,
});

/** Soles → céntimos enteros (redondeo a la céntima más cercana). */
export function toCents(soles) {
  return Math.round((Number(soles) || 0) * 100);
}

/** Céntimos → soles (número con 2 decimales). */
export function fromCents(cents) {
  return Math.round(cents) / 100;
}

/** `percent`% de `cents`, redondeado a la céntima. */
function percentOf(cents, percent) {
  return Math.round((cents * Number(percent || 0)) / 100);
}

/** Valida y normaliza la configuración. Lanza un Error con un mensaje claro. */
export function normalizeConfig(input = {}) {
  const config = { ...DEFAULT_DISTRIBUTION_CONFIG };
  for (const key of Object.keys(DEFAULT_DISTRIBUTION_CONFIG)) {
    if (input[key] === undefined || input[key] === null || input[key] === '') continue;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('Los porcentajes deben estar entre 0 y 100.');
    }
    config[key] = Math.round(value * 100) / 100;
  }
  const sum = config.reinvestPercent + config.salaryPercent + config.reservePercent;
  if (Math.abs(sum - 100) > 0.001) {
    throw new Error(`Reinversión + sueldo + reserva deben sumar 100% (ahora suman ${sum}%).`);
  }
  return config;
}

/**
 * Desglose de una venta. Montos en soles; devuelve todo en soles (2 decimales).
 *
 * @param {object} sale
 * @param {number} sale.price        precio total de la venta (cantidad × precio unitario)
 * @param {number} sale.cost         costo total del producto vendido
 * @param {number} [sale.commission] comisión del vendedor (si ya se conoce el monto)
 * @param {number} [sale.commissionPercent] % de comisión (si no se pasa `commission`)
 * @param {number} [sale.logistics]  envío que pagó el negocio (0 si lo pagó el cliente)
 * @param {number} [sale.otherCosts] otros gastos de esta venta
 * @param {object} config            ver DEFAULT_DISTRIBUTION_CONFIG
 */
export function computeBreakdown(sale, config = DEFAULT_DISTRIBUTION_CONFIG) {
  const price = toCents(sale.price);
  const cost = toCents(sale.cost);
  const commission =
    sale.commission !== undefined && sale.commission !== null
      ? toCents(sale.commission)
      : percentOf(price, sale.commissionPercent);
  const logistics = toCents(sale.logistics);
  const otherCosts = toCents(sale.otherCosts);
  const tax = percentOf(price, config.taxPercent);
  const net = price - cost - commission - logistics - otherCosts - tax;

  // Solo se reparte si hubo utilidad; con pérdida, los sobres no reciben nada.
  // La reserva se lleva los céntimos de redondeo para que el reparto sume exacto.
  let reinvest = 0;
  let salary = 0;
  let reserve = 0;
  if (net > 0) {
    reinvest = percentOf(net, config.reinvestPercent);
    salary = percentOf(net, config.salaryPercent);
    reserve = net - reinvest - salary;
  }

  const marginPercent = price > 0 ? Math.round((net / price) * 10000) / 100 : 0;
  return {
    price: fromCents(price),
    cost: fromCents(cost),
    commission: fromCents(commission),
    logistics: fromCents(logistics),
    otherCosts: fromCents(otherCosts),
    tax: fromCents(tax),
    netProfit: fromCents(net),
    reinvest: fromCents(reinvest),
    salary: fromCents(salary),
    reserve: fromCents(reserve),
    marginPercent,
    lowMargin: marginPercent < Number(config.minMarginPercent ?? 0),
  };
}

/**
 * Pronóstico si vendes todo el stock a precio de lista: el capital (lo que te
 * costó) que vuelve, la ganancia (precio − costo − comisión − impuesto) y lo
 * que entraría a la caja. Solo cuenta perfumes con precio y costo conocidos;
 * los que no tienen compra registrada o precio se informan aparte.
 *
 * @param {{ stock: number, price: number, unitCost: number|null }[]} items
 * @param {{ commissionPercent?: number, taxPercent?: number }} rates
 */
export function sellOutForecast(items, { commissionPercent = 0, taxPercent = 0 } = {}) {
  let units = 0;
  let retail = 0;
  let cost = 0;
  const noCost = { count: 0, units: 0, retail: 0 };
  const noPrice = { count: 0, units: 0 };
  for (const item of items) {
    const stock = Math.max(Math.floor(Number(item.stock) || 0), 0);
    if (stock === 0) continue;
    const price = toCents(item.price);
    if (price <= 0) {
      noPrice.count += 1;
      noPrice.units += stock;
    } else if (item.unitCost == null) {
      noCost.count += 1;
      noCost.units += stock;
      noCost.retail += stock * price;
    } else {
      units += stock;
      retail += stock * price;
      cost += toCents(stock * Number(item.unitCost));
    }
  }
  const commission = percentOf(retail, commissionPercent);
  const tax = percentOf(retail, taxPercent);
  const profit = retail - cost - commission - tax;
  return {
    units,
    retail: fromCents(retail),
    capital: fromCents(cost),
    commission: fromCents(commission),
    tax: fromCents(tax),
    profit: fromCents(profit),
    cashIn: fromCents(retail - commission - tax),
    marginPercent: retail > 0 ? Math.round((profit / retail) * 1000) / 10 : 0,
    noCost: { ...noCost, retail: fromCents(noCost.retail) },
    noPrice,
  };
}

/**
 * Reparte un monto en partes proporcionales a `weights`, en céntimos, sin
 * perder céntimos (la última parte se lleva el redondeo). Útil para dividir el
 * envío de una venta con varios perfumes.
 */
export function splitProportionally(amount, weights) {
  const total = toCents(amount);
  const sum = weights.reduce((s, w) => s + Math.max(Number(w) || 0, 0), 0);
  if (weights.length === 0) return [];
  let assigned = 0;
  return weights.map((w, index) => {
    if (index === weights.length - 1) return fromCents(total - assigned);
    const part = sum > 0 ? Math.round((total * Math.max(Number(w) || 0, 0)) / sum) : 0;
    assigned += part;
    return fromCents(part);
  });
}
