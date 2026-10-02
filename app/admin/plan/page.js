import Link from 'next/link';
import { getCurrentRole } from '@/lib/session';
import { backfillBreakdowns } from '@/lib/db';
import { getBusinessPlan } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const soles = (value) => {
  const n = Number(value) || 0;
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'America/Lima' });

function buyHref(item) {
  if (!item.best) return '/admin/proveedores';
  return `/admin/compras?perfumeId=${item.id}&unitCost=${item.best.price}&note=${encodeURIComponent(
    `${item.best.supplierName} · ${item.best.tierLabel}`,
  )}`;
}

export default async function PlanPage() {
  const role = await getCurrentRole();
  if (role !== 'admin') {
    return <p className="admin-no-access">No tienes permiso para ver esta sección.</p>;
  }

  let plan;
  try {
    await backfillBreakdowns();
    plan = await getBusinessPlan();
  } catch (error) {
    return (
      <section className="admin-section">
        <h1>Plan</h1>
        <p className="form-error">{error.message}</p>
      </section>
    );
  }

  const r = plan.recovery;
  const p = plan.perfumes;
  const done = r.remaining <= 0;

  return (
    <section className="admin-section reports">
      <div className="admin-header">
        <h1>Tu plan</h1>
      </div>
      <p className="hint">
        Calculado con tus ventas, compras, sobres y proveedores reales. Se actualiza solo cada vez que
        registras algo.
      </p>

      <div className="chart-card plan-perfumes">
        <h3 className="chart-title">Tu inversión en perfumes, reinvirtiendo todo</h3>
        <div className="plan-perfumes-row">
          <div>
            <span className="kpi-label">Pusiste en perfumes</span>
            <strong className="plan-big">{soles(p.invested)}</strong>
          </div>
          <div>
            <span className="kpi-label">Ya vendiste (al costo)</span>
            <strong className="plan-big">{soles(p.soldCost)}</strong>
            <span className="hint">{p.turnedPercent}% de tu inversión ya volvió vendiendo</span>
          </div>
          <div>
            <span className="kpi-label">Tu negocio vale hoy</span>
            <strong className={`plan-big ${p.businessValue >= p.invested ? 'text-good' : ''}`}>{soles(p.businessValue)}</strong>
            <span className="hint">Caja + perfumes al costo + te deben − deudas − comisión por pagar</span>
          </div>
        </div>
        <p className="plan-explain">
          {p.businessValue >= p.invested
            ? `Tu dinero no se perdió: en valor ya superaste lo que pusiste en perfumes. `
            : `Tu dinero no se perdió: está convertido en perfumes, caja y lo que te deben. `}
          Como reinviertes todo lo que entra, vuelve a tu bolsillo <strong>solo con lo que saques</strong>
          {p.withdrawn > 0 ? ` (ya sacaste ${soles(p.withdrawn)})` : ''}. Te faltan{' '}
          <strong>{soles(p.cashToRecover)}</strong> en efectivo:
        </p>
        <table className="report-table plan-scenarios">
          <thead>
            <tr>
              <th scope="col">Si de ahora en adelante…</th>
              <th scope="col" className="num">Sacas al mes</th>
              <th scope="col" className="num">Recuperas en</th>
            </tr>
          </thead>
          <tbody>
            {p.scenarios.map((s) => (
              <tr key={s.key}>
                <th scope="row">
                  {s.label}
                  <span className="report-sub">{s.note}</span>
                </th>
                <td className="num">{soles(s.perMonth)}</td>
                <td className="num">
                  <strong>
                    {s.months === 0
                      ? 'Ya recuperado'
                      : s.months == null
                        ? 'Nunca en efectivo'
                        : `~${s.months.toLocaleString('es-PE')} meses · ${monthFmt.format(new Date(Date.now() + s.months * 30 * 86400000))}`}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          «Sacas al mes» usa tu ritmo actual de utilidad neta ({soles(r.monthlyPace)}/mes). Para sacar tu
          sueldo usa Caja → Registrar salida → Saqué para mí.
        </p>
      </div>

      <div className="plan-grid">
        <div className="chart-card plan-recovery">
          <h3 className="chart-title">Recuperación de todo lo que pusiste (perfumes y gastos)</h3>
          {done ? (
            <p className="plan-big text-good">🎉 Ya recuperaste lo que pusiste</p>
          ) : r.monthsLeft ? (
            <p className="plan-big">
              ~{r.monthsLeft.toLocaleString('es-PE')} {r.monthsLeft === 1 ? 'mes' : 'meses'}
              <small> · hacia {monthFmt.format(r.estimatedDate)}</small>
            </p>
          ) : (
            <p className="plan-big">Aún sin ventas para estimar</p>
          )}
          <div
            className="debt-progress plan-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={r.percent}
            aria-label={`Recuperado ${r.percent}%`}
          >
            <span style={{ width: `${r.percent}%` }} />
          </div>
          <ul className="profit-list">
            <li>
              <span>Pusiste de tu bolsillo</span>
              <strong>{soles(r.invested)}</strong>
            </li>
            <li>
              <span>Ya recuperaste (utilidad neta acumulada · {r.percent}%)</span>
              <strong className="text-good">{soles(r.recovered)}</strong>
            </li>
            <li>
              <span>Te falta</span>
              <strong>{soles(r.remaining)}</strong>
            </li>
            <li>
              <span>Tu ritmo (utilidad neta por mes)</span>
              <strong>{soles(r.monthlyPace)}</strong>
            </li>
          </ul>
          <p className="hint">
            Fecha estimada = lo que falta ÷ tu ritmo de los últimos {Math.min(r.activeDays, 90)} días. Vendiendo
            más, cobrando a tiempo y cuidando el margen, llega antes.
          </p>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Dónde está tu dinero hoy</h3>
          <ul className="profit-list">
            <li>
              <span>
                <Link href="/admin/caja">En caja</Link>
              </span>
              <strong>{soles(plan.cash)}</strong>
            </li>
            <li>
              <span>
                <Link href="/admin/reportes?vista=inventario">En perfumes ({plan.stock.units} unid.) · al costo</Link>
              </span>
              <strong>{soles(plan.stock.costValue)}</strong>
            </li>
            <li>
              <span>Esos perfumes a precio de venta</span>
              <strong className="text-good">{soles(plan.stock.retailValue)}</strong>
            </li>
            <li>
              <span>
                <Link href="/admin/distribucion">Presupuesto para comprar (Reposición + Reinversión)</Link>
              </span>
              <strong>{soles(plan.buyBudget)}</strong>
            </li>
          </ul>
          <p className="hint">
            Si vendieras hoy todo tu stock a precio de lista, entrarían {soles(plan.stock.retailValue)}.
            {plan.stock.withoutCost ? ` (${plan.stock.withoutCost} perfume(s) sin compra registrada no suman al costo.)` : ''}
          </p>
        </div>
      </div>

      <h2 className="dashboard-heading">Qué hacer ahora</h2>
      {plan.actions.length === 0 ? (
        <p className="hint">Todo en orden por ahora. 👌</p>
      ) : (
        <ul className="plan-actions">
          {plan.actions.map((a) => (
            <li key={a.title} className={`plan-action plan-action-${a.tone}`}>
              <div>
                <strong>{a.title}</strong>
                <p>{a.text}</p>
              </div>
              <Link href={a.href} className="btn-secondary">
                {a.cta} →
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="dashboard-heading" id="comprar">
        Qué comprar
      </h2>
      <p className="hint">
        Perfumes que vendiste en los últimos 60 días y cuyo stock no alcanza para el próximo mes, con el precio
        por mayor más barato de tus proveedores. Presupuesto: <strong>{soles(plan.buyBudget)}</strong> — lo que
        entra en el presupuesto va marcado ✓. Recuerda que el precio por mayor suele ser desde 6 unidades
        (puedes combinar perfumes del mismo proveedor).
      </p>
      {plan.buyList.length === 0 ? (
        <p className="hint">No hay que reponer nada por ahora: tu stock alcanza para lo que vendes.</p>
      ) : (
        <div className="pivot-scroll">
          <table className="report-table plan-buy-table">
            <thead>
              <tr>
                <th scope="col">Perfume</th>
                <th scope="col" className="num">Vendiste (30 días)</th>
                <th scope="col" className="num">Stock</th>
                <th scope="col" className="num">Comprar</th>
                <th scope="col">Proveedor más barato</th>
                <th scope="col" className="num">Ganas por unidad</th>
                <th scope="col" className="num">Total</th>
                <th scope="col" aria-label="Acción" />
              </tr>
            </thead>
            <tbody>
              {plan.buyList.map((item) => (
                <tr key={item.id} className={item.fits ? '' : 'plan-over-budget'}>
                  <th scope="row">
                    {item.fits ? '✓ ' : ''}
                    {item.name}
                    {item.suggestedPrice ? (
                      <span className="report-sub text-critical">
                        Margen {item.margin}%: sube el precio a S/ {item.suggestedPrice} (hoy S/ {item.price})
                      </span>
                    ) : null}
                  </th>
                  <td className="num">{item.sold30}</td>
                  <td className="num">{item.stock}</td>
                  <td className="num">
                    <strong>{item.quantity}</strong>
                  </td>
                  <td>
                    {item.best ? (
                      <>
                        {item.best.supplierName}
                        <span className="report-sub">
                          {soles(item.unitCost)} · {item.best.tierLabel}
                        </span>
                      </>
                    ) : (
                      <span className="hint">Sin precio de proveedor</span>
                    )}
                  </td>
                  <td className="num">{item.unitProfit == null ? '—' : soles(item.unitProfit)}</td>
                  <td className="num">{item.total == null ? '—' : soles(item.total)}</td>
                  <td>
                    <Link href={buyHref(item)} className="btn-primary comparison-buy-link">
                      {item.best ? 'Comprar' : 'Ver proveedores'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
