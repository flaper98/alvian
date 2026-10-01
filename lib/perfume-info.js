// Ficha de cada perfume de los proveedores: categoría, marca, notas olfativas
// y descripción. Se usa al agregarlos al catálogo desde Proveedores, para que
// lleguen completos.
//
// Las notas se tomaron de las fichas que publican tiendas y bases de
// fragancias (Parfumo, Basenotes, Notino, Lattafa USA, tiendas mayoristas),
// octubre 2026. Si un perfume no tenía información confiable (o solo aparecía
// otro con nombre parecido), NO se inventó: queda sin notas y, si no se sabe
// para quién es, sin categoría. Complétalos a mano en el Catálogo.
//
// Formato de notas: "salida · corazón · fondo".

const INFO = [
  // ---------- Lattafa ----------
  {
    names: ['Qaed Al Fursan'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Piña, azafrán · Jazmín, bálsamo de abeto · Madera de oud, cedro, ámbar',
    description:
      'Fragancia de Lattafa que une la dulzura de la piña con el azafrán, sobre un fondo amaderado de oud, cedro y ámbar.',
  },
  {
    names: ['Qaed Al Fursan Untamed'],
    brand: 'Lattafa',
    category: 'unisex',
    notes:
      'Canela, mandarina, nuez moscada, cardamomo · Caramelo, lavanda, geranio, salvia · Cedro, incienso, vetiver, ámbar',
    description:
      'La versión intensa de Qaed Al Fursan: especias cálidas y caramelo sobre un fondo resinoso de incienso, vetiver y ámbar.',
  },
  {
    names: ['Yara Tous'],
    brand: 'Lattafa',
    category: 'mujer',
    notes: 'Mango, coco, maracuyá · Jazmín, heliotropo, azahar · Vainilla, almizcle, cachemira',
    description:
      'La versión tropical de Yara: mango, coco y maracuyá sobre flores blancas y un fondo cremoso de vainilla.',
  },
  {
    names: ['Noble Blush', 'Badee Al Oud Noble Blush'],
    brand: 'Lattafa',
    category: 'mujer',
    notes: 'Leche de rosas · Almendra, merengue · Almizcle, vainilla, sándalo',
    description:
      'Floral cremoso de la línea Badee Al Oud: rosa con leche, almendra y merengue sobre vainilla y sándalo.',
  },
  {
    names: ['Honor & Glory', 'Honor and Glory', 'Badee Al Oud Honor & Glory'],
    brand: 'Lattafa',
    category: 'unisex',
    notes:
      'Piña, crème brûlée · Benjuí, canela, cúrcuma, pimienta negra · Vainilla, sándalo, cachemira, musgo',
    description:
      'Ámbar especiado de la línea Badee Al Oud: piña y crème brûlée con canela y pimienta, sobre vainilla y sándalo.',
  },
  {
    names: ['Oud For Glory', 'Badee Al Oud Oud For Glory'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Azafrán, nuez moscada, lavanda · Oud, pachulí · Oud, pachulí, almizcle',
    description:
      'Ámbar amaderado de la línea Badee Al Oud: azafrán y especias sobre un corazón intenso de oud y pachulí.',
  },
  {
    names: ['Amethyst', 'Badee Al Oud Amethyst'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Pimienta rosa, bergamota · Rosa turca, rosa búlgara, jazmín · Oud, ámbar, vainilla',
    description:
      'Badee Al Oud Amethyst: rosas y jazmín con un toque de pimienta rosa, sobre oud, ámbar y vainilla.',
  },
  {
    names: ['Maahir'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Frutos rojos, durazno, bergamota · Jazmín, peonía, lirio rojo · Sándalo, flor de vainilla, almizcle',
    description:
      'Floral ambarado de Lattafa: frutos rojos y durazno con jazmín y peonía, sobre sándalo y vainilla.',
  },
  {
    names: ['Suqraat'],
    brand: 'Lattafa',
    category: 'hombre',
    notes: 'Bergamota, jengibre · Hoja de violeta, lavanda · Sándalo, ámbar, almizcle',
    description:
      'Fragancia masculina de Lattafa, fresca y aromática: bergamota y jengibre con lavanda, sobre sándalo y ámbar.',
  },
  {
    names: ['Vintage Castle'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Pachulí verde, iris · Pachulí, mimosa · Pachulí, civeta, malvavisco',
    description:
      'De la línea Niche Emarati de Lattafa: un homenaje al pachulí, que va de verde y fresco a dulce con malvavisco.',
  },
  {
    names: ['Carat White Gold', '24 Carat White Gold'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Bergamota, azahar · Lavanda, nuez moscada, pimienta rosa, geranio · Vetiver, haba tonka, oud',
    description:
      '24 Carat White Gold de Lattafa: aromático y especiado, con bergamota, lavanda y pimienta rosa sobre vetiver y oud.',
  },
  {
    names: ['Eclaire Pistacho', 'Eclaire Pistache', 'Eclaire Pistachio'],
    brand: 'Lattafa',
    category: 'mujer',
    notes: 'Crema de pistacho, pistacho tostado · Coco, cacao, crema batida · Vainilla, leche, almizcle',
    description:
      'Gourmand cremoso de la línea Eclaire de Lattafa: pistacho tostado, cacao y crema sobre vainilla y leche.',
  },
  {
    names: ['Fakhar Platin'],
    brand: 'Lattafa',
    category: 'unisex',
    notes: 'Bergamota, pimienta rosa, cardamomo · Jengibre, lavanda, guayaba · Palo santo, incienso, sándalo',
    description:
      'Fougère aromático de Lattafa: especias frescas, lavanda y guayaba sobre palo santo, incienso y sándalo.',
  },

  // ---------- Armaf ----------
  {
    names: ['Odyssey Spectra'],
    brand: 'Armaf',
    category: 'unisex',
    notes:
      'Manzana, bergamota, canela · Lavanda, lirio de los valles, azahar · Tabaco, ámbar, haba tonka, pachulí, vainilla',
    description:
      'Oriental especiado de Armaf: abre fresco con manzana, bergamota y canela, y termina cálido con tabaco, ámbar y vainilla.',
  },
  {
    names: ['Odyssey Candee'],
    brand: 'Armaf',
    category: 'mujer',
    notes: 'Fresa, frambuesa, bergamota, durazno · Caramelo, jazmín, maracuyá · Ámbar, pachulí, almizcle',
    description: 'Dulce y frutal de Armaf: fresa y frambuesa con caramelo y jazmín, sobre ámbar y almizcle.',
  },
  {
    names: ['Odyssey Mega'],
    brand: 'Armaf',
    category: 'hombre',
    notes:
      'Naranja, jengibre, bergamota, limón, menta · Piña, enebro, geranio, salvia · Haba tonka, almizcle, cedro, vetiver',
    description:
      'Amaderado aromático de Armaf para hombre: cítricos y jengibre con piña y salvia, sobre cedro y vetiver.',
  },
  {
    names: ['Odyssey Limoni'],
    brand: 'Armaf',
    category: 'unisex',
    notes: 'Limón, naranja dulce, bergamota, mandarina · Jengibre, azahar, acorde marino · Ámbar, almizcle, té azul',
    description: 'Cítrico fresco de Armaf: limón y mandarina con jengibre y un toque marino, ideal para el día.',
  },

  // ---------- Rasasi ----------
  {
    names: ['Hawas Elixir'],
    brand: 'Rasasi',
    category: 'unisex',
    notes: 'Menta, bergamota, artemisa · Lavanda, chocolate amargo, benjuí · Vainilla, haba tonka, almizcle blanco',
    description:
      'Hawas en versión oriental: menta y bergamota frescas con lavanda y chocolate amargo, sobre vainilla y tonka.',
  },

  // ---------- Vurv (línea de diseñador de Lattafa) ----------
  {
    names: ['Pantherette'],
    brand: 'Vurv',
    category: 'unisex',
    notes:
      'Grosella negra, pimienta rosa, bergamota · Jazmín sambac, oud, rosa · Ámbar gris, pachulí, vainilla, almizcle',
    description:
      'De Vurv, la línea de diseñador de Lattafa: grosella negra y pimienta rosa con jazmín, oud y rosa, sobre pachulí y vainilla.',
  },
  {
    names: ['Opal Noir Women', 'Opal Noir'],
    brand: 'Vurv',
    category: 'mujer',
    notes:
      'Pera, azahar, pimienta rosa · Jazmín, café, almendra amarga, regaliz · Pachulí, vainilla, cedro, cachemira',
    description: 'Para mujer, de Vurv: pera y azahar con jazmín y café, sobre pachulí y vainilla.',
  },
  {
    names: ['Entice Ruby Women', 'Entice Ruby'],
    brand: 'Vurv',
    category: 'mujer',
    notes: 'Frutos rojos, bergamota, mandarina · Rosa, jazmín, flores blancas · Vainilla, ámbar, almizcle, maderas suaves',
    description: 'Floral frutal de Vurv para mujer: frutos rojos con rosa y jazmín, sobre vainilla y ámbar.',
  },
  {
    names: ['Viviana Women', 'Viviana', 'Viviana Pour Femme'],
    brand: 'Vurv',
    category: 'mujer',
    notes: 'Mandarina, bergamota, durazno blanco · Azahar, vetiver · Akigalawood, ámbar, vainilla, almizcle',
    description: 'Para mujer, de Vurv: mandarina y durazno blanco con azahar, sobre vainilla y almizcle.',
  },
  {
    names: ['Victoreux Femme', 'Victorieux Femme'],
    brand: 'Vurv',
    category: 'mujer',
    notes: 'Durazno blanco, heliotropo · Iris, sándalo, flores blancas · Ámbar, almizcle',
    description: 'Para mujer, de Vurv: durazno blanco y heliotropo con iris y flores blancas, sobre ámbar y almizcle.',
  },
  {
    names: ['Fairy'],
    brand: 'Vurv',
    category: 'mujer',
    notes: 'Frutas frescas, cítricos · Flores, jazmín · Vainilla, almizcle, maderas',
    description: 'Floral dulce de Vurv para mujer: frutas y cítricos con jazmín, sobre vainilla y almizcle.',
  },
  // Sin notas confiables publicadas: solo se sabe la marca (y el público, por el nombre).
  { names: ['Queenly Women', 'Queenly'], brand: 'Vurv', category: 'mujer' },
  { names: ['Dareful Homme Sport'], brand: 'Vurv', category: 'hombre' },
  { names: ['Timeline'], brand: 'Vurv' },
  { names: ['Trumph Noir', 'Triumph Noir'], brand: 'Vurv' },
  { names: ['Toccante'], brand: 'Vurv' },
  { names: ['Grace Di Profumo'], brand: 'Vurv' },

  // ---------- Zakat ----------
  {
    names: ['Sweet Fantasy'],
    brand: 'Zakat',
    category: 'mujer',
    notes:
      'Frutas confitadas, glaseado de azúcar, frutos del bosque · Glaseado de vainilla, acorde de pastelería · Almizcle, sándalo, ámbar',
    description:
      'Gourmand divertido de Zakat: frutas confitadas y frutos del bosque con glaseado de vainilla y notas de pastelería.',
  },
  {
    names: ['Mushy Mallowes', 'Mushy Mallows'],
    brand: 'Zakat',
    category: 'mujer',
    notes:
      'Cristales de azúcar, frutas confitadas · Malvavisco, crema de vainilla, crema batida · Almizcle, sándalo, ámbar',
    description:
      'Gourmand de Zakat con aroma a malvavisco: azúcar y frutas confitadas con crema de vainilla, sobre almizcle y sándalo.',
  },
  {
    names: ['Creamy Caramel'],
    brand: 'Zakat',
    category: 'mujer',
    notes: 'Azúcar mantecosa, especias suaves · Caramelo, crema de vainilla, leche · Almizcle, sándalo, ámbar',
    description: 'Gourmand acogedor de Zakat: caramelo derretido y crema de vainilla sobre almizcle y maderas cálidas.',
  },
  {
    names: ['Vani Landia'],
    brand: 'Zakat',
    category: 'mujer',
    notes: 'Caramelos frutales · Azúcar, flores suaves · Almizcle ligero, vainilla cremosa',
    description: 'Inspirado en un cupcake de vainilla: dulce, juvenil y alegre, de la línea gourmand de Zakat.',
  },
  {
    names: ['Rose Gold', 'Zakat Rose Gold'],
    brand: 'Zakat',
    category: 'mujer',
    notes: 'Jazmín · Orquídea · Ámbar',
    description: 'Floral de Zakat: jazmín y orquídea cremosa sobre un fondo cálido de ámbar.',
  },
  {
    names: ['Pure Gold', 'Zakat Pure Gold'],
    brand: 'Zakat',
    category: 'mujer',
    notes: 'Bergamota, pimienta rosa · Rosa, jazmín, ámbar · Vainilla, almizcle, sándalo',
    description: 'Oriental de Zakat: bergamota y pimienta rosa con rosa y jazmín, sobre vainilla y sándalo.',
  },
  {
    names: ['Avant'],
    brand: 'Zakat',
    category: 'hombre',
    notes: 'Bergamota, pera, lavanda negra, menta · Comino, canela, salvia · Vainilla negra, ámbar, maderas',
    description:
      'Fragancia masculina de Zakat, intensa y a la vez delicada: pera y lavanda con especias, sobre vainilla negra y ámbar.',
  },
  // Sin notas confiables publicadas.
  { names: ['Yummy Landia'], brand: 'Zakat' },
  { names: ['Kingdom Of Kings'], brand: 'Zakat' },
  { names: ['Kingdom Empire'], brand: 'Zakat' },
  { names: ['Kingdom Crown'], brand: 'Zakat' },
  { names: ['Kingdom Imperial'], brand: 'Zakat' },
  { names: ['Kingdom Royal'], brand: 'Zakat' },
  { names: ['Kingdom Essence'], brand: 'Zakat' },
  { names: ['Candylicious Bliss'], brand: 'Zakat' },
  { names: ['Mayira'], brand: 'Zakat' },
  { names: ['Royale Opal', 'Zakat Royale Opal'], brand: 'Zakat' },
  { names: ['Al Awwal Malaki'], brand: 'Zakat' },
  { names: ['Crystal Aurum'], brand: 'Zakat' },

  // ---------- Amaran ----------
  {
    names: ['Sugar Rush Its Bliss', "Sugar Rush It's Bliss"],
    brand: 'Amaran',
    category: 'mujer',
    notes: 'Pera, durazno blanco, mandarina · Fresia, vainilla, rosa · Madera de cachemira, almizcle blanco, ámbar',
    description:
      'De la colección Sugar Rush de Amaran: frutas frescas con fresia y rosa, sobre un fondo cálido y empolvado.',
  },
  {
    names: ['Sugar Rush Sweetness Overload'],
    brand: 'Amaran',
    category: 'mujer',
    notes: 'Algodón de azúcar, caramelo · Crema, vainilla, malvavisco · Praliné, almizcle, haba tonka',
    description: 'Gourmand intenso de Amaran: algodón de azúcar y caramelo con crema y malvavisco, sobre praliné.',
  },
  {
    names: ['Sugar Rush Sprinkle Joy'],
    brand: 'Amaran',
    category: 'mujer',
    notes: 'Fresa, frambuesa, algodón de azúcar · Crema, caramelo, malvavisco · Vainilla, praliné, almizcle',
    description:
      'Dulce y alegre, de Amaran: fresa y frambuesa con algodón de azúcar y crema, sobre vainilla y praliné.',
  },
  {
    names: ['Sugar Rush Sugary Fusion'],
    brand: 'Amaran',
    category: 'mujer',
    notes: 'Naranja, mandarina, bergamota, canela',
    description: 'Gourmand de Amaran donde lo dulce se encuentra con lo especiado: abre con cítricos y un toque de canela.',
  },
];

// Palabras que no ayudan a identificar el perfume (la marca suele venir pegada
// al nombre en las listas de proveedores: "Avant Zakat", "Timeline Vurv").
const NOISE = /\b(lattafa|armaf|rasasi|afnan|vurv|zakat|amaran|zoghbi|eau de parfum|edp|edt|\d+\s*ml)\b/gi;

/** Clave para comparar nombres: sin marca, tildes, espacios ni signos. */
export function perfumeInfoKey(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(NOISE, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const BY_KEY = new Map();
for (const entry of INFO) {
  for (const name of entry.names) BY_KEY.set(perfumeInfoKey(name), entry);
}

/** Ficha conocida de un perfume por su nombre, o null. */
export function findPerfumeInfo(name) {
  return BY_KEY.get(perfumeInfoKey(name)) || null;
}

// Nombres distintos para el mismo perfume entre proveedores y tu catálogo
// (para que no se dupliquen al agregarlos). Clave → clave, con perfumeInfoKey.
export const NAME_ALIASES = new Map([
  [perfumeInfoKey('Eclaire Banofi'), perfumeInfoKey('Eclaire Bonoffi')],
  [perfumeInfoKey('Eclaire Banoffi'), perfumeInfoKey('Eclaire Bonoffi')],
]);
