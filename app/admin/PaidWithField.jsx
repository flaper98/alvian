// Una sola caja: todo lo que se paga sale de la caja del negocio. Si pones
// dinero de tu bolsillo, se registra aparte como "Puse dinero" (en Caja).
//
// Los registros antiguos pueden decir "capital" (pagado de tu bolsillo antes de
// existir "Puse dinero"); se conservan tal cual para no cambiar tus números.

/** Etiqueta solo para registros antiguos pagados de tu bolsillo. */
export function PaidWithBadge({ value }) {
  return value === 'capital' ? <span className="badge badge-gold">De tu bolsillo</span> : null;
}

/**
 * Ya no se pregunta con qué dinero se pagó. Este campo oculto guarda "sale de
 * la caja" en los registros nuevos y conserva el valor de los antiguos al editar.
 */
export default function PaidWithField({ defaultValue = '' }) {
  return <input type="hidden" name="paidWith" value={defaultValue || 'ganancias'} />;
}
