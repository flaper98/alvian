// Guías (artículos) de la tienda: responden lo que la gente busca en Google
// ("mejores perfumes árabes para hombre", "perfume parecido a Sauvage"…) y
// enlazan a las fichas de producto.
//
// Cada sección puede mostrar perfumes del catálogo:
// - perfumes: slugs de /perfume/[slug] (si un perfume se renombra o se oculta,
//   simplemente no aparece);
// - pick: elegidos por precio y categoría al momento ({ category, minPrice, maxPrice, limit }).
// En los textos, [texto](/ruta) es un enlace y **texto** va en negrita.

export const GUIDES = [
  {
    slug: 'mejores-perfumes-arabes-para-hombre',
    title: 'Los mejores perfumes árabes para hombre',
    metaTitle: 'Mejores Perfumes Árabes para Hombre: Guía para Elegir el Tuyo',
    description:
      'Los perfumes árabes para hombre más recomendados: 9 PM, Khamrah, Asad, Hawas y Mandarin Sky. Para qué ocasión es cada uno y cuál elegir según tu estilo.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 5,
    intro:
      'Los perfumes árabes se ganaron un lugar entre los hombres que quieren oler bien todo el día sin pagar precios de perfume de diseñador. Duran más que muchas fragancias comerciales, tienen estelas que se notan y hay opciones para cada estilo: frescas para el calor, dulces para la noche y especiadas para destacar. Te ayudamos a elegir según cómo y cuándo lo vas a usar.',
    sections: [
      {
        heading: 'Para la noche y las citas: dulces y envolventes',
        paragraphs: [
          '[9 PM de Afnan](/perfume/9-pm) es de los más elogiados: manzana, canela y lavanda sobre un fondo de vainilla y ámbar, en una mezcla cálida que suele compararse con Ultra Male de Jean Paul Gaultier. [Khamrah](/perfume/khamrah-lattafa) va por el lado especiado y goloso, con canela, dátiles y praliné; y si quieres algo más oscuro, [Khamrah Dukhan](/perfume/khamrah-dukhan) le suma un toque ahumado de incienso.',
          'Son perfumes potentes: con **2 o 3 atomizaciones** es suficiente. Con el calor se sienten más intensos, así que lúcelos de noche.',
        ],
        perfumes: ['9-pm', 'khamrah-lattafa', 'khamrah-dukhan', 'mandarin-elixir'],
      },
      {
        heading: 'Para destacar: especiados y con carácter',
        paragraphs: [
          '[Asad de Lattafa](/perfume/asad-lattafa) abre con pimienta negra y tabaco, y se asienta en vainilla y ámbar: un perfume profundo que suele compararse con Sauvage Elixir de Dior. [Club de Nuit de Armaf](/perfume/club-de-nuit) combina una salida afrutada con un fondo amaderado y ahumado que rinde todo el día. Si prefieres algo sobrio y elegante, [His Confession](/perfume/his-confession) es cálido, atalcado y con mucha clase.',
        ],
        perfumes: ['asad-lattafa', 'club-de-nuit', 'his-confession', 'hawas-kobra'],
      },
      {
        heading: 'Para el día a día y el calor: frescos',
        paragraphs: [
          'Para la oficina, la universidad o el gimnasio, lo mejor es un aroma fresco. [Hawas Ice](/perfume/hawas-ice) tiene un acorde helado muy refrescante, [9AM Dive](/perfume/9am-dive) es cítrico y acuático, y [Odyssey Mega](/perfume/odyssey-mega) es limpio y elegante para todos los días. Si vives en Pucallpa o en la selva, mira también nuestra [guía de perfumes para el calor](/guias/perfumes-para-el-calor).',
        ],
        perfumes: ['hawas-ice', '9am-dive', 'odyssey-mega', 'dareful-homme-sport-vurv'],
      },
      {
        heading: 'Si es tu primer perfume árabe',
        paragraphs: [
          'Empieza por uno versátil, que funcione de día y de noche y guste a casi todos. [Hawas for Him](/perfume/hawas-for-him) es fresco, ligeramente dulce y de los frescos que más duran. [Mandarin Sky](/perfume/mandarin-sky) es alegre y dulce, con la mandarina como protagonista, y suele compararse con Scandal Pour Homme de Jean Paul Gaultier.',
        ],
        perfumes: ['hawas-for-him', 'mandarin-sky'],
      },
    ],
    tips: {
      heading: 'Cómo elegir el tuyo',
      items: [
        '**¿Cuándo lo usarás más?** De día y con calor: fresco. De noche y en reuniones: dulce o especiado.',
        '**¿Quieres que se note?** Los dulces y especiados tienen más estela; los frescos son más discretos.',
        '**¿Es para regalar?** Elige uno versátil como Hawas for Him o Mandarin Sky.',
        '¿Dudas? Escríbenos por WhatsApp y te recomendamos según los perfumes que ya te gustan.',
      ],
    },
    faq: [
      {
        q: '¿Cuál es el perfume árabe para hombre que más dura?',
        a: 'Los dulces e intensos, como 9 PM, Khamrah o Asad, son los que más duran en la piel. Los frescos duran menos, aunque Hawas for Him destaca por su duración entre los perfumes frescos.',
      },
      {
        q: '¿Qué perfume árabe le regalo a un hombre si no conozco sus gustos?',
        a: 'Uno versátil: Hawas for Him o Mandarin Sky gustan a casi todos y sirven para el día y la noche.',
      },
    ],
  },
  {
    slug: 'mejores-perfumes-arabes-para-mujer',
    title: 'Los mejores perfumes árabes para mujer',
    metaTitle: 'Mejores Perfumes Árabes para Mujer: Yara, Eclaire, Hawas y Más',
    description:
      'Los perfumes árabes para mujer más buscados: la colección Yara, Eclaire, Hawas For Her y Fakhar Rose. Dulces, frutales o florales: cuál elegir según tu estilo.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 5,
    intro:
      'Los perfumes árabes para mujer son famosos por su dulzura, su duración y sus frascos llamativos. Hay de todo: golosos que huelen a postre, frutales y alegres para el día, florales elegantes y versiones intensas para la noche. Aquí los ordenamos por estilo para que encuentres el tuyo.',
    sections: [
      {
        heading: 'Dulces y golosos: los que huelen a postre',
        paragraphs: [
          'Los perfumes «gourmand» son la gran tendencia. [Yara Candy](/perfume/yara-candy) es la versión más golosa de la colección Yara, con notas que recuerdan a caramelos. [Eclaire](/perfume/eclaire) combina caramelo, leche y miel como un postre francés, y sus versiones [Eclaire Banoffi](/perfume/eclaire-banoffi) (banana y dulce de leche) y [Eclaire Pistache](/perfume/eclaire-pistache) (pistacho) son de lo más original que hay.',
        ],
        perfumes: ['yara-candy', 'eclaire', 'eclaire-banoffi', 'eclaire-pistache'],
      },
      {
        heading: 'Frutales y alegres para el día',
        paragraphs: [
          '[Yara Tous](/perfume/yara-tous) es tropical: mango, coco y maracuyá con un fondo de vainilla, ideal para el calor. [Yara Pink](/perfume/yara-pink) y [Hawas Pink](/perfume/hawas-pink) son frutales y florales, dulces sin empalagar. Y [Bade\'e Al Oud Sublime](/perfume/bade-e-al-oud-sublime), con manzana y lichi, deja una sensación de limpio que genera muchos cumplidos.',
        ],
        perfumes: ['yara-tous', 'yara-pink', 'hawas-pink', 'bade-e-al-oud-sublime'],
      },
      {
        heading: 'Florales y elegantes',
        paragraphs: [
          'Si prefieres algo delicado y sofisticado: [Fakhar Rose](/perfume/fakhar-rose) tiene flores blancas y frutas dulces sobre un fondo cremoso; [Hawas For Her](/perfume/hawas-for-her) es floral y fresca para todos los días; y [Bade\'e Al Oud Noble Blush](/perfume/bade-e-al-oud-noble-blush) es dulce y refinado, en un frasco rosa que luce mucho como regalo.',
        ],
        perfumes: ['fakhar-rose', 'hawas-for-her', 'bade-e-al-oud-noble-blush', 'yara-moi'],
      },
      {
        heading: 'Intensos para la noche',
        paragraphs: [
          '[Yara Elixir](/perfume/yara-elixir) es la versión más intensa de Yara, cremosa y envolvente. [Bade\'e Al Oud Amethyst](/perfume/bade-e-al-oud-amethyst) combina rosas, especias y oud para quien quiere un perfume con mucha personalidad.',
        ],
        perfumes: ['yara-elixir', 'bade-e-al-oud-amethyst', 'creamy-caramel-zakat', 'odyssey-candee'],
      },
    ],
    tips: {
      heading: 'Cómo elegir el tuyo',
      items: [
        '**¿Te gustan los postres y lo dulce?** Ve por Yara Candy o la línea Eclaire.',
        '**¿Lo usarás de día y con calor?** Mejor frutal o floral: Yara Tous, Yara Pink o Hawas For Her.',
        '**¿Para la noche?** Yara Elixir o Bade\'e Al Oud Amethyst.',
        '¿Dudas? Escríbenos por WhatsApp y te ayudamos a elegir.',
      ],
    },
    faq: [
      {
        q: '¿Cuál es el perfume árabe más famoso para mujer?',
        a: 'La colección Yara de Lattafa es de las más populares del mundo. Tiene varias versiones: Yara Candy (golosa), Yara Tous (tropical), Yara Pink (frutal), Yara Moi (floral) y Yara Elixir (intensa).',
      },
      {
        q: '¿Qué perfume árabe dura más para mujer?',
        a: 'Los dulces e intensos, como Yara Elixir, Eclaire o Bade\'e Al Oud Amethyst, son los que más duran. Los frutales y florales son más ligeros, ideales para el día.',
      },
    ],
  },
  {
    slug: 'perfumes-arabes-parecidos-a-perfumes-de-disenador',
    title: 'Perfumes árabes parecidos a perfumes de diseñador',
    metaTitle: 'Perfumes Árabes Parecidos a Sauvage, Ultra Male y Baccarat Rouge',
    description:
      'Perfumes árabes originales con un estilo parecido a perfumes famosos: Asad (Sauvage Elixir), 9 PM (Ultra Male), Mandarin Sky (Scandal) y más. Qué son y en qué se diferencian.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 4,
    intro:
      'Muchas casas árabes crean fragancias con un perfil parecido al de perfumes famosos de diseñador y de nicho. **No son copias ni réplicas**: son perfumes originales de marcas como Lattafa, Afnan, Armaf o Zakat, con su propia fórmula y su propio nombre, que comparten el estilo de un perfume conocido. Por eso tanta gente los busca: obtienes un aroma de ese estilo por una fracción del precio.',
    sections: [
      {
        heading: 'Si te gusta Sauvage Elixir (Dior): Asad de Lattafa',
        paragraphs: [
          '[Asad](/perfume/asad-lattafa) comparte el estilo especiado y oscuro: pimienta negra y tabaco en la salida, café e iris en el corazón y un fondo de vainilla, ámbar y maderas. Es intenso, masculino y con gran proyección.',
        ],
        perfumes: ['asad-lattafa'],
      },
      {
        heading: 'Si te gusta Ultra Male (Jean Paul Gaultier): 9 PM de Afnan',
        paragraphs: [
          '[9 PM](/perfume/9-pm) es dulce y seductor: manzana, canela y lavanda sobre vainilla, haba tonka y ámbar. Es de los perfumes árabes que más cumplidos reciben en salidas y fiestas.',
        ],
        perfumes: ['9-pm'],
      },
      {
        heading: 'Si te gusta Scandal Pour Homme (Jean Paul Gaultier): Mandarin Sky de Armaf',
        paragraphs: [
          '[Mandarin Sky](/perfume/mandarin-sky) tiene la mandarina como protagonista, con un corazón de caramelo y un fondo de haba tonka y vetiver. Si lo quieres más intenso y cálido, prueba [Mandarin Elixir](/perfume/mandarin-elixir).',
        ],
        perfumes: ['mandarin-sky', 'mandarin-elixir'],
      },
      {
        heading: 'Si te gusta Angels\' Share (Kilian): Khamrah de Lattafa',
        paragraphs: [
          '[Khamrah](/perfume/khamrah-lattafa) es dulce, especiado y envolvente: canela, dátiles y praliné sobre vainilla y haba tonka. Si te gusta el café, [Khamrah Qahwa](/perfume/khamrah-qahwa) es su versión con acorde de café.',
        ],
        perfumes: ['khamrah-lattafa', 'khamrah-qahwa'],
      },
      {
        heading: 'Si te gusta Baccarat Rouge 540 (Maison Francis Kurkdjian): Al Awwal Malaki de Zakat',
        paragraphs: [
          '[Al Awwal Malaki](/perfume/al-awwal-malaki-zakat) está inspirado en el perfil de uno de los perfumes de nicho más famosos del mundo: dulce, sofisticado y con una estela que no pasa desapercibida. Una forma accesible de llevar un aroma de lujo.',
        ],
        perfumes: ['al-awwal-malaki-zakat'],
      },
      {
        heading: '¿Huelen exactamente igual?',
        paragraphs: [
          'No. Se parecen en el estilo y en las notas principales, pero cada uno tiene su propia evolución en la piel. Muchos clientes terminan prefiriendo la versión árabe por su duración y su precio. Y si buscas el original de diseñador, también tenemos [Stronger With You Intensely de Giorgio Armani](/perfume/stronger-with-you-intensely).',
        ],
        perfumes: ['stronger-with-you-intensely'],
      },
    ],
    faq: [
      {
        q: '¿Los perfumes árabes son réplicas?',
        a: 'No. Son perfumes originales de marcas árabes reconocidas, con su propio nombre y fórmula. Algunos comparten el estilo de un perfume famoso, pero no se venden como ese perfume.',
      },
      {
        q: '¿Por qué son más baratos que los de diseñador?',
        a: 'Las casas árabes producen en gran volumen y gastan mucho menos en publicidad y licencias de marca que las grandes firmas de diseñador. Por eso ofrecen alta concentración a mejor precio.',
      },
    ],
  },
  {
    slug: 'perfumes-para-el-calor',
    title: 'Perfumes frescos para el calor de Pucallpa',
    metaTitle: 'Perfumes para el Calor: los Mejores para Pucallpa y la Selva',
    description:
      'Qué perfume usar con calor y humedad: los mejores perfumes árabes frescos para Pucallpa y la selva, para él y para ella, y cómo hacer que duren más.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 4,
    intro:
      'En Pucallpa hace calor casi todo el año, y eso cambia cómo se comporta un perfume: el calor hace que el aroma se evapore más rápido y que los perfumes dulces se sientan más pesados. La clave es elegir fragancias **frescas** —cítricas, acuáticas o aromáticas— para el día, y dejar las dulces e intensas para la noche.',
    sections: [
      {
        heading: 'Para él',
        paragraphs: [
          '[Hawas Ice](/perfume/hawas-ice) tiene un acorde helado que refresca desde la primera aplicación. [Hawas for Him](/perfume/hawas-for-him) es acuático y ligeramente dulce, con una duración sobresaliente para un perfume fresco. [Hawas Malibu](/perfume/hawas-malibu) transmite brisa marina, y [Odyssey Mega](/perfume/odyssey-mega) es limpio y elegante para la oficina.',
        ],
        perfumes: ['hawas-ice', 'hawas-for-him', 'hawas-malibu', 'odyssey-mega'],
      },
      {
        heading: 'Para ella',
        paragraphs: [
          '[Yara Tous](/perfume/yara-tous) es tropical, con mango, coco y maracuyá. [Hawas For Her](/perfume/hawas-for-her) es floral y fresca, y [Yara Pink](/perfume/yara-pink) es frutal y alegre. [Fairy de Vurv](/perfume/fairy-vurv) es delicado y muy fácil de llevar a diario.',
        ],
        perfumes: ['yara-tous', 'hawas-for-her', 'yara-pink', 'fairy-vurv'],
      },
      {
        heading: 'Para compartir: unisex',
        paragraphs: [
          '[Odyssey Limoni](/perfume/odyssey-limoni) está hecho para el calor extremo, con el limón como protagonista. [9AM Dive](/perfume/9am-dive) es cítrico y acuático, con sensación de recién bañado, y [Bade\'e Al Oud Sublime](/perfume/bade-e-al-oud-sublime) es frutal y deja un aroma a limpio.',
        ],
        perfumes: ['odyssey-limoni', '9am-dive', 'bade-e-al-oud-sublime', 'fakhar-platin'],
      },
    ],
    tips: {
      heading: 'Cómo usar perfume con calor y humedad',
      items: [
        'Aplícalo después de bañarte, con la piel limpia y seca.',
        'Hidrata la piel con una crema sin aroma: el perfume se fija mejor en piel hidratada.',
        'Rocía también un poco en la ropa: la tela retiene el aroma más que la piel con sudor.',
        'Lleva un frasco pequeño o un decant para retocar en la tarde.',
        'Guarda tu perfume lejos del sol y del calor: nunca en el carro ni en la moto.',
      ],
    },
    faq: [
      {
        q: '¿Qué perfume dura más con el calor?',
        a: 'Entre los frescos, Hawas for Him destaca por su duración. Los dulces duran más, pero con calor pueden sentirse pesados: úsalos mejor de noche.',
      },
      {
        q: '¿Puedo usar perfumes dulces en Pucallpa?',
        a: 'Sí, pero mejor de noche o en lugares con aire acondicionado, y con menos atomizaciones: el calor los hace sentir más intensos.',
      },
    ],
  },
  {
    slug: 'como-saber-si-un-perfume-arabe-es-original',
    title: 'Cómo saber si un perfume árabe es original',
    metaTitle: 'Cómo Saber si un Perfume Árabe es Original: 6 Cosas que Revisar',
    description:
      'Cómo reconocer un perfume árabe original (Lattafa, Armaf, Rasasi, Afnan): precio, caja, sellado, código de lote, frasco y dónde comprar con confianza.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 4,
    intro:
      'Los perfumes árabes se volvieron tan populares que también aparecieron imitaciones. La buena noticia es que hay señales claras para reconocer uno original. Revisa estos puntos antes de comprar.',
    sections: [
      {
        heading: '1. El precio',
        paragraphs: [
          'Los perfumes árabes cuestan menos que los de diseñador, pero tienen un precio de mercado. Si encuentras uno **muy por debajo** de lo que cuesta en otras tiendas, desconfía.',
        ],
      },
      {
        heading: '2. La caja y el celofán',
        paragraphs: [
          'Un perfume nuevo llega sellado, con el celofán bien ajustado y sin arrugas. La caja original tiene impresión nítida, colores correctos y textos sin faltas de ortografía. Cajas con colores apagados, letras borrosas o pegamento visible son una mala señal.',
        ],
      },
      {
        heading: '3. El código de lote',
        paragraphs: [
          'Las cajas y los frascos originales traen un código de lote (batch code) impreso o grabado. Normalmente el código de la caja coincide con el del frasco. Si no tiene código, o no coinciden, pregunta antes de comprar.',
        ],
      },
      {
        heading: '4. El frasco y el atomizador',
        paragraphs: [
          'El frasco original tiene buen peso, acabados limpios y una tapa que encaja bien. El atomizador debe soltar una nube fina y pareja, sin chorros ni fugas.',
        ],
      },
      {
        heading: '5. El aroma y la duración',
        paragraphs: [
          'Las imitaciones suelen oler fuerte a alcohol al inicio y desaparecer rápido. Un original evoluciona en la piel durante horas: la salida cambia y aparecen el corazón y el fondo del perfume.',
        ],
      },
      {
        heading: '6. Dónde compras',
        paragraphs: [
          'Compra en tiendas que respondan tus preguntas, tengan reseñas reales y te muestren el producto. En Alvian Perfumes todos nuestros perfumes son originales y llegan sellados. Si tienes dudas sobre alguno, [escríbenos por WhatsApp](/contacto) antes de comprar.',
        ],
      },
    ],
    faq: [
      {
        q: '¿Un perfume árabe original puede ser barato?',
        a: 'Sí: las marcas árabes cuestan menos que las de diseñador porque gastan menos en publicidad y licencias. Lo sospechoso es encontrarlos muy por debajo de su precio normal de mercado.',
      },
      {
        q: '¿Los perfumes de Alvian son originales?',
        a: 'Sí. Vendemos perfumes 100% originales, sellados de fábrica, de marcas como Lattafa, Armaf, Rasasi, Afnan y Zakat.',
      },
    ],
  },
  {
    slug: 'cuanto-dura-un-perfume-arabe',
    title: '¿Cuánto dura un perfume árabe? Cómo hacer que dure más',
    metaTitle: '¿Cuánto Dura un Perfume Árabe? Trucos para que Dure Más',
    description:
      'Cuánto dura un perfume árabe en la piel, por qué a veces dejas de olerlo y trucos para que dure más: dónde aplicarlo, cuántas atomizaciones y cómo guardarlo.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 4,
    intro:
      'Una de las razones por las que los perfumes árabes son tan populares es su duración. Pero cuánto dura un perfume depende de varias cosas: su concentración, su familia olfativa, tu piel y el clima. Aquí te explicamos todo y te damos trucos para que el tuyo dure más.',
    sections: [
      {
        heading: 'Eau de Parfum: más concentración, más duración',
        paragraphs: [
          'La mayoría de perfumes árabes son **Eau de Parfum (EDP)**, con una concentración de esencia más alta (aproximadamente 15–20%) que un Eau de Toilette (5–15%). Por eso suelen durar más en la piel y dejar más estela.',
        ],
      },
      {
        heading: 'Qué hace que dure más o menos',
        paragraphs: [
          '**La familia del perfume:** los dulces, ambarados y amaderados duran más; los cítricos y acuáticos se evaporan antes. **Tu piel:** la piel seca retiene menos el aroma que la piel hidratada. **El clima:** con calor el perfume se siente más fuerte, pero se evapora más rápido.',
        ],
      },
      {
        heading: '¿Por qué dejo de oler mi perfume?',
        paragraphs: [
          'Se llama fatiga olfativa: tu nariz se acostumbra al aroma después de un rato y deja de notarlo, pero las personas a tu alrededor sí lo siguen sintiendo. No le eches más por eso: pregúntale a alguien cercano si todavía se nota.',
        ],
      },
      {
        heading: 'Perfumes intensos para máxima duración',
        paragraphs: [
          'Si lo que buscas es que tu perfume te acompañe todo el día, elige uno dulce o especiado como [9 PM](/perfume/9-pm), [Khamrah](/perfume/khamrah-lattafa), [Asad](/perfume/asad-lattafa) o [Yara Elixir](/perfume/yara-elixir).',
        ],
        perfumes: ['9-pm', 'khamrah-lattafa', 'asad-lattafa', 'yara-elixir'],
      },
    ],
    tips: {
      heading: 'Trucos para que tu perfume dure más',
      items: [
        'Aplícalo después de bañarte, sobre la piel limpia e hidratada (una crema sin aroma o un poco de vaselina ayudan).',
        'Rocíalo en los puntos de pulso: cuello, detrás de las orejas, muñecas y pecho.',
        '**No frotes las muñecas:** rompe las notas y hace que el aroma dure menos.',
        'Un poco en la ropa también ayuda, pero cuidado con telas delicadas o de color claro.',
        'Con 3 o 4 atomizaciones es suficiente; en perfumes intensos, menos.',
        'Guárdalo en su caja, en un lugar fresco y oscuro. El baño, por la humedad y el calor, no es buen lugar.',
      ],
    },
    faq: [
      {
        q: '¿Cuánto dura un perfume árabe en la piel?',
        a: 'Depende del perfume: los dulces e intensos pueden durar buena parte del día, y los frescos y cítricos, menos. El clima y tu tipo de piel también influyen.',
      },
      {
        q: '¿Un perfume se vence?',
        a: 'Bien guardado, un perfume dura años. La luz, el calor y la humedad lo deterioran: guárdalo en su caja y lejos del sol.',
      },
    ],
  },
  {
    slug: 'perfumes-arabes-para-regalar',
    title: 'Perfumes árabes para regalar: ideas por presupuesto',
    metaTitle: 'Perfumes Árabes para Regalar: Ideas por Presupuesto en Soles',
    description:
      'Ideas de perfumes árabes para regalar según tu presupuesto: hasta S/ 150, de S/ 150 a S/ 200 y más. Qué regalar si no conoces sus gustos.',
    published: '2026-10-28',
    updated: '2026-10-28',
    minutes: 3,
    intro:
      'Un perfume es de los regalos que más se agradecen: es personal, se usa todos los días y recuerda a quien lo regaló. Te dejamos ideas según cuánto quieras gastar, con los precios de hoy, y consejos para acertar aunque no conozcas sus gustos.',
    sections: [
      {
        heading: 'Hasta S/ 150',
        pick: { maxPrice: 150, limit: 4 },
      },
      {
        heading: 'De S/ 150 a S/ 200',
        pick: { minPrice: 150.01, maxPrice: 200, limit: 4 },
      },
      {
        heading: 'Más de S/ 200',
        pick: { minPrice: 200.01, limit: 4 },
      },
      {
        heading: 'Si no conoces sus gustos',
        paragraphs: [
          'Elige un perfume versátil, que funcione de día y de noche. **Para él:** [Hawas for Him](/perfume/hawas-for-him) o [Mandarin Sky](/perfume/mandarin-sky). **Para ella:** [Yara Pink](/perfume/yara-pink) o [Hawas For Her](/perfume/hawas-for-her). **Unisex:** [Bade\'e Al Oud Sublime](/perfume/bade-e-al-oud-sublime).',
        ],
      },
      {
        heading: 'Frascos que lucen como regalo',
        paragraphs: [
          'Algunos perfumes se ganan al primer vistazo: el frasco rosa de [Noble Blush](/perfume/bade-e-al-oud-noble-blush), el dorado de [24 Carat White Gold](/perfume/24-carat-white-gold) o la botella azul de [Candylicious Bliss](/perfume/candylicious-bliss-zakat).',
        ],
        perfumes: ['bade-e-al-oud-noble-blush', '24-carat-white-gold', 'candylicious-bliss-zakat', 'his-confession'],
      },
    ],
    faq: [
      {
        q: '¿Hacen envíos a todo el Perú?',
        a: 'Sí. Hacemos delivery en Pucallpa, Yarinacocha y Manantay, y enviamos por agencia a cualquier ciudad del Perú.',
      },
      {
        q: '¿Puedo pagar con Yape o Plin?',
        a: 'Sí, aceptamos Yape y Plin. Al finalizar tu pedido verás los datos para pagar.',
      },
    ],
  },
];

export function findGuide(slug) {
  return GUIDES.find((guide) => guide.slug === slug) || null;
}

/** Guías que mencionan un perfume (por su slug), para enlazarlas desde su ficha. */
export function guidesForPerfume(slug) {
  return GUIDES.filter((guide) => guide.sections.some((section) => section.perfumes?.includes(slug)));
}

/**
 * Perfumes de una sección, tomados del catálogo de la tienda: los indicados
 * por slug (en ese orden) o los elegidos por precio, con stock primero.
 */
export function sectionPerfumes(section, perfumes, slugOf) {
  if (section.perfumes) {
    const bySlug = new Map(perfumes.map((p) => [slugOf(p), p]));
    return section.perfumes.map((slug) => bySlug.get(slug)).filter(Boolean);
  }
  if (section.pick) {
    const { category, minPrice = 0, maxPrice = Infinity, limit = 4 } = section.pick;
    return perfumes
      .filter((p) => (!category || p.category === category) && Number(p.price) >= minPrice && Number(p.price) <= maxPrice)
      .sort(
        (a, b) =>
          Number(b.stock > 0) - Number(a.stock > 0) ||
          Number(b.featured) - Number(a.featured) ||
          Number(a.price) - Number(b.price),
      )
      .slice(0, limit);
  }
  return [];
}
