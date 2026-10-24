const STEPS = ['Carrito', 'Datos y pago', 'Confirmación'];

/**
 * Pasos de la compra (1 Carrito · 2 Datos y pago · 3 Confirmación). `current`
 * empieza en 0. `tone="dark"` es para la banda verde del checkout.
 */
export default function CheckoutSteps({ current, tone = 'light' }) {
  return (
    <ol className={`buy-steps${tone === 'dark' ? ' is-dark' : ''}`} aria-label="Pasos de la compra">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={i < current ? 'is-done' : i === current ? 'is-on' : undefined}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="buy-step-dot" aria-hidden="true">
            {i < current ? '✓' : i + 1}
          </span>
          <span className="buy-step-label">{label}</span>
          {i < current ? <span className="sr-only"> (completado)</span> : null}
        </li>
      ))}
    </ol>
  );
}
