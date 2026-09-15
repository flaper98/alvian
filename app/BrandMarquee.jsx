// Marcas que confirmadamente vendemos, según las líneas de perfumes del
// catálogo (Hawas → Rasasi, Khamrah/Yara → Lattafa, 9 PM → Afnan,
// Club de Nuit/Odyssey → Armaf). Agrega más aquí cuando sumes otras marcas.
const BRANDS = ['Lattafa', 'Armaf', 'Rasasi', 'Afnan'];

export default function BrandMarquee() {
  const items = [...BRANDS, ...BRANDS];

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
