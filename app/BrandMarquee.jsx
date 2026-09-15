// Marcas que confirmadamente vendemos, según las líneas de perfumes del
// catálogo (Hawas → Rasasi, Khamrah/Yara → Lattafa, 9 PM → Afnan,
// Club de Nuit/Odyssey → Armaf). Agrega más aquí cuando sumes otras marcas.
const BRANDS = ['Lattafa', 'Armaf', 'Rasasi', 'Afnan'];

// El track se anima de 0% a -50%, así que esos primeros "50%" (un set) deben
// ser más anchos que cualquier pantalla real, o se ve un hueco en blanco a la
// derecha antes de que el loop vuelva a empezar. Con solo 4 marcas eso pasaba
// en monitores anchos, así que cada set repite la lista varias veces.
const SET_REPEAT = 6;
const ONE_SET = Array.from({ length: SET_REPEAT }, () => BRANDS).flat();

export default function BrandMarquee() {
  const items = [...ONE_SET, ...ONE_SET];

  return (
    <div className="brand-marquee" aria-hidden="true">
      <div className="brand-marquee-track">
        {items.map((brand, index) => (
          <span key={`${brand}-${index}`} className="brand-chip">
            {brand}
          </span>
        ))}
      </div>
    </div>
  );
}
