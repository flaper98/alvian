import Link from 'next/link';
import { PERIODS } from '@/lib/db';
import PfBaseSwitch from './PfBaseSwitch';
import PfOutflowFormModal from './PfOutflowFormModal';
import PfOutflowsList from './PfOutflowsList';
import PfPlanFormModal from './PfPlanFormModal';

const money = (value) => {
  const n = Number(value);
  return `${n < 0 ? '−' : ''}S/ ${Math.abs(n).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

function PeriodSwitch({ period }) {
  return (
    <nav className="filter-chips period-switch" aria-label="Período">
      {Object.entries(PERIODS).map(([key, label]) => (
        <Link
          key={key}
          href={`/admin/profit-first?periodo=${key}`}
          className={`filter-chip${period === key ? ' active' : ''}`}
          aria-current={period === key ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export default function ProfitFirstView({ period, data, outflows, currentPercents }) {
  const periodLabel = PERIODS[period].toLowerCase();

  return (
    <section className="admin-section">
      <div className="admin-header">
        <h1>Reparto de lo que entra</h1>
        <PeriodSwitch period={period} />
      </div>
      <p className="hint">
        Cada sol que entra se reparte solo entre ganancia, sueldo, impuestos, gastos y deuda, con los
        porcentajes que tú defines. Usa los mismos ingresos de Resumen y Retiros, así que siempre
        cuadra con ellos.
      </p>

      <div className="chart-card">
        <h3 className="chart-title">Base a repartir · {periodLabel}</h3>
        <ul className="profit-list flow-list">
          <li className="flow-line flow-line-in">
            <span>Entró (cobrado)</span>
            <strong>{money(data.gross)}</strong>
          </li>
          {data.mode === 'neto' ? (
            <li className="flow-line flow-line-out">
              <span>Reinvertido en perfumes con ganancias</span>
              <strong>− {money(data.reinvested)}</strong>
            </li>
          ) : null}
          <li className="flow-total">
            <span>Base que se reparte</span>
            <strong>{money(data.base)}</strong>
          </li>
        </ul>
        <PfBaseSwitch base={data.mode} />
        <p className="hint">
          {data.mode === 'neto'
            ? 'Recomendado: la mercadería que ya repusiste con tus ganancias no se reparte, así no retiras plata que ya está en perfumes. Solo cuenta lo marcado como "Reinversión" en Compras; lo que pagaste con tu capital no se descuenta.'
            : 'Se reparte todo lo que entró, aunque parte ya la hayas usado para reponer mercadería.'}
        </p>
      </div>

      <div className="kpi-grid">
        {data.categories.map((category) => (
          <div
            key={category.key}
            className={`kpi-tile${category.balance < 0 ? ' kpi-tile-bad' : ''}`}
          >
            <span className="kpi-label">
              {category.label} · {category.percent}%
            </span>
            <strong className="kpi-value">{money(category.allocated)}</strong>
            <span className="kpi-sub">
              Salidas {money(category.outflows)} · Saldo {money(category.balance)}
            </span>
          </div>
        ))}
      </div>

      <div className="admin-header">
        <h2>Detalle por categoría</h2>
        <div className="admin-header-actions">
          <PfPlanFormModal percents={currentPercents} />
          <PfOutflowFormModal />
        </div>
      </div>
      <div className="perfume-table-wrap">
        <table className="perfume-table table-cards">
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              <th scope="col">%</th>
              <th scope="col">Asignado</th>
              <th scope="col">Salidas</th>
              <th scope="col">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {data.categories.map((category) => (
              <tr key={category.key} className="perfume-table-row">
                <td className="table-cards-title">
                  <strong>{category.label}</strong>
                  <p className="perfume-table-description">{category.hint}</p>
                </td>
                <td className="perfume-table-stock-cell" data-label="Porcentaje">
                  {category.percent}%
                </td>
                <td className="perfume-table-price-cell" data-label="Asignado">
                  {money(category.allocated)}
                </td>
                <td className="perfume-table-price-cell" data-label="Salidas">
                  {money(category.outflows)}
                  {category.outAuto > 0 && category.outManual > 0 ? (
                    <p className="perfume-table-description">
                      Automático {money(category.outAuto)} · manual {money(category.outManual)}
                    </p>
                  ) : null}
                </td>
                <td
                  className={`perfume-table-price-cell${category.balance < 0 ? ' text-critical' : ''}`}
                  data-label="Saldo"
                >
                  <strong>{money(category.balance)}</strong>
                </td>
              </tr>
            ))}
            <tr className="perfume-table-row">
              <td className="table-cards-title">
                <strong>Total</strong>
              </td>
              <td className="perfume-table-stock-cell" data-label="Porcentaje">
                100%
              </td>
              <td className="perfume-table-price-cell" data-label="Asignado">
                <strong>{money(data.totals.allocated)}</strong>
              </td>
              <td className="perfume-table-price-cell" data-label="Salidas">
                <strong>{money(data.totals.outflows)}</strong>
              </td>
              <td className="perfume-table-price-cell" data-label="Saldo">
                <strong>{money(data.totals.balance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="hint">
        <strong>Mi sueldo</strong> se descuenta de Retiros y <strong>Gastos operativos</strong> de tus
        gastos pagados con ganancias y las comisiones. En &quot;Mes&quot; el saldo es el del mes; en
        &quot;Todo&quot; es lo acumulado desde el inicio.
      </p>

      {data.insights.length > 0 ? (
        <div className="chart-card">
          <h3 className="chart-title">Avisos según tus números</h3>
          <ul className="pf-insights">
            {data.insights.map((insight) => (
              <li key={insight.text} className={`pf-insight pf-insight-${insight.tone}`}>
                {insight.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h2>Salidas manuales · {periodLabel}</h2>
      <PfOutflowsList outflows={outflows} />
    </section>
  );
}
