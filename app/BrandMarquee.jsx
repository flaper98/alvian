// Marcas que confirmadamente vendemos, según las líneas de perfumes del
// catálogo (Hawas → Rasasi, Khamrah/Yara → Lattafa, 9 PM → Afnan,
// Club de Nuit/Odyssey → Armaf). Agrega más aquí cuando sumes otras marcas.
const BRANDS = ['Lattafa', 'Armaf', 'Rasasi', 'Afnan', '100% originales'];

// El track se anima de 0% a -50%: cada "set" repite la lista varias veces para
// ser más ancho que cualquier pantalla y que nunca se vea un hueco.
const SET_REPEAT = 4;
const ONE_SET = Array.from({ length: SET_REPEAT }, () => BRANDS).flat();

/** Cinta oscura con las marcas, separadas por rombos dorados. */
export default function BrandMarquee() {
  const items = [...ONE_SET, ...ONE_SET];
  return (
    <div className="sf-marquee" aria-label="Marcas: Lattafa, Armaf, Rasasi y Afnan">
      <div className="sf-marquee-track" aria-hidden="true">
        {items.map((brand, index) => (
          <span key={`${brand}-${index}`} className="sf-marquee-item">
            {brand}
            <i>◆</i>
          </span>
        ))}
      </div>
    </div>
  );
}
