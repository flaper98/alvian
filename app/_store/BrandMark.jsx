/**
 * Isotipo de Alvian (luna + gota) en SVG, nítido a cualquier tamaño.
 * `ink` = color de la luna, `hole` = color del fondo donde se usa
 * (el centro de la luna se "recorta" pintándolo del color del fondo).
 */
export default function BrandMark({ size = 34, ink = '#0e2b21', hole = '#ffffff', drop = '#c9993c', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="370 320 390 390"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle cx="545" cy="508" r="155" fill={ink} />
      <circle cx="594" cy="469" r="134" fill={ink} />
      <circle cx="578" cy="479" r="119" fill={hole} />
      <path
        d="M697 560 C712 585 738 612 738 643 A41 41 0 0 1 656 643 C656 612 682 585 697 560 Z"
        fill={drop}
      />
    </svg>
  );
}
