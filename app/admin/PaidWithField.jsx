export function PaidWithBadge({ value }) {
  return value === 'ganancias' ? (
    <span className="badge badge-paid">Reinversión</span>
  ) : (
    <span className="badge badge-gold">Capital</span>
  );
}

export default function PaidWithField({ defaultValue = '' }) {
  return (
    <label>
      ¿Con qué dinero lo pagaste?
      <select name="paidWith" defaultValue={defaultValue} required>
        <option value="" disabled>
          Elige una opción
        </option>
        <option value="ganancias">Con las ganancias del negocio (reinversión)</option>
        <option value="capital">Con mi capital (de mi bolsillo)</option>
      </select>
    </label>
  );
}
