const STEPS = ['Carrito', 'Datos y pago', 'Confirmación'];

/** Pasos de la compra (1 Carrito · 2 Datos y pago · 3 Confirmación). `current` empieza en 0. */
export default function CheckoutSteps({ current }) {
  return (
    <ol className="buy-steps" aria-label="Pasos de la compra">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={i < current ? 'is-done' : i === current ? 'is-on' : undefined}
          aria-current={i === current ? 'step' : undefined}
        >
          <span>{i < current ? '✓' : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
