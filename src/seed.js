// Datos iniciales de Majori Sushi Los Laureles, transcritos desde el catálogo
// de WhatsApp Business e Instagram (@majori_loslaureles).
// Solo se usan la primera vez que arranca el servidor: después todo se edita
// desde la intranet (/admin) y se guarda en data/db.json.

const crypto = require('crypto');

const id = () => crypto.randomBytes(6).toString('hex');

const PROTEINAS = ['Pollo', 'Camarón'];
const VEGETALES = ['Palta', 'Cebollín', 'Champiñón', 'Pimentón', 'Aceitunas', 'Palmito'];

const optList = (names, price = 0) => names.map((name) => ({ name, price }));

const FORMATO_HANDROLL = {
  id: id(),
  name: 'Formato',
  min: 1,
  max: 1,
  options: [
    { name: 'Handroll', price: 0 },
    { name: 'Roll (9 a 10 cortes)', price: 300 },
  ],
};

const SALMON = { name: 'Cambiar proteína por salmón', price: 500 };

function buildSeed() {
  const categories = [];
  const products = [];
  let catOrder = 0;

  function category(data, items) {
    const cat = {
      id: id(),
      name: data.name,
      description: data.description || '',
      image: data.image || '',
      visible: true,
      order: catOrder++,
      optionGroups: data.optionGroups || [],
    };
    categories.push(cat);
    items.forEach((it, i) => {
      products.push({
        id: id(),
        categoryId: cat.id,
        name: it.name,
        description: it.description || '',
        details: it.details || [],
        price: it.price,
        image: it.image || '',
        badge: it.badge || '',
        visible: true,
        available: true,
        featured: !!it.featured,
        order: i,
        optionGroups: it.optionGroups || [],
      });
    });
  }

  const tipoTabla = (hot) => ({
    id: id(),
    name: 'Tipo de tabla',
    min: 1,
    max: 1,
    options: [
      { name: 'Mixta', price: 0 },
      { name: 'Hot (todo frito)', price: hot },
    ],
  });

  category(
    {
      name: 'Tablas',
      description: 'Para compartir. Se debe realizar la transferencia antes de empezar el pedido.',
      image: '/img/tablas.jpg',
    },
    [
      {
        name: 'Tabla 1 · 24 piezas',
        price: 9500,
        featured: true,
        badge: 'Más pedida',
        image: '/img/tablas.jpg',
        details: [
          '10 cortes pollo Majori, palta, queso crema en hotroll',
          '10 cortes kanikama, cebollín, queso crema envuelto en nori',
          '4 bolitas crispy',
          '2 salsas y palitos',
        ],
        optionGroups: [tipoTabla(1000)],
      },
      {
        name: 'Tabla 2 · 44 piezas',
        price: 16000,
        details: [
          '10 cortes pollo Majori, pimentón, queso crema en hotroll',
          '10 cortes camarón furay, cebollín, queso crema envuelto en semilla',
          '10 cortes kanikama, cebollín, queso crema envuelto en nori',
          '10 cortes hosomaki, queso crema, pimentón en hotroll',
          '4 bolitas krispy',
          '4 salsas y palitos',
        ],
        optionGroups: [tipoTabla(1500)],
      },
      {
        name: 'Tabla 3 · 54 piezas',
        price: 18500,
        details: [
          '10 cortes pollo Majori, pimentón, queso crema en hotroll',
          '10 cortes camarón furay, cebollín, queso crema envuelto en semilla',
          '10 cortes kanikama, cebollín, queso crema envuelto en nori',
          '10 cortes salmón, palta, queso crema envuelto en queso crema',
          '10 cortes hosomaki queso crema, pimentón en hotroll',
          '4 bolitas krispy',
          '5 salsas y palitos',
        ],
        optionGroups: [tipoTabla(1000)],
      },
      {
        name: 'Tabla 4 · 64 piezas',
        price: 20500,
        details: [
          '10 cortes pollo Majori, pimentón, queso crema en hotroll',
          '10 cortes camarón furay, cebollín, queso crema envuelto en semilla',
          '10 cortes kanikama, cebollín, queso crema envuelto en nori',
          '10 cortes salmón, palta, queso crema envuelto en queso crema',
          '10 cortes pollo, palta, queso crema en hotroll',
          '10 cortes hosomaki, palta, queso crema en hotroll',
          '4 bolitas krispy',
          '6 salsas y palitos',
        ],
        optionGroups: [tipoTabla(1000)],
      },
      {
        name: 'Tabla 5 · 88 piezas',
        price: 24000,
        badge: 'Para el grupo',
        details: [
          '10 cortes pollo Majori, pimentón, queso crema en hotroll',
          '10 cortes camarón, cebollín, queso crema en hotroll',
          '10 cortes kanikama, cebollín, queso crema envuelto en nori',
          '10 cortes salmón, palta, queso crema envuelto en queso crema',
          '10 cortes pollo, palta, queso crema en hotroll',
          '10 cortes champiñón, aceituna, queso crema envuelto en palta',
          '10 cortes hosomaki, palta, queso crema en hotroll',
          '10 cortes hosomaki, pimentón, queso crema en hotroll',
          '8 bolitas krispy',
          '8 salsas y palitos',
        ],
        optionGroups: [tipoTabla(1500)],
      },
    ]
  );

  category(
    {
      name: 'Handrolls Panko',
      description: 'Handroll frito en panko. Cámbialo a roll de 9 a 10 cortes por $300.',
      image: '/img/panko-salmon.jpg',
      optionGroups: [FORMATO_HANDROLL],
    },
    [
      { name: 'Pollo, queso crema, palta', price: 3800, image: '/img/panko-pollo.jpg', featured: true },
      { name: 'Pollo, queso crema, cebollín', price: 3700, image: '/img/panko-pollo.jpg' },
      { name: 'Pollo, queso crema, pimentón', price: 3700, image: '/img/panko-pollo.jpg' },
      { name: 'Pollo, queso crema, aceituna', price: 3600, image: '/img/panko-pollo.jpg' },
      { name: 'Pollo, queso crema, champiñón', price: 3600, image: '/img/panko-pollo.jpg' },
      { name: 'Salmón, queso crema, palta', price: 4000, image: '/img/panko-salmon.jpg' },
      { name: 'Salmón, queso crema, cebollín', price: 3900, image: '/img/panko-salmon.jpg' },
      { name: 'Camarón furay, queso crema, palta', price: 3800, image: '/img/panko-camaron.jpg' },
      { name: 'Camarón furay, queso crema, cebollín', price: 3700, image: '/img/panko-camaron.jpg' },
      { name: 'Kanikama, queso crema, palta', price: 3600, image: '/img/panko-kanikama.jpg' },
      { name: 'Kanikama, queso crema, cebollín', price: 3400, image: '/img/panko-kanikama.jpg' },
    ]
  );

  const envoltura = {
    id: id(),
    name: 'Envoltura',
    min: 1,
    max: 1,
    options: optList(['Nori', 'Semilla']),
  };

  category(
    {
      name: 'Handrolls Nori o Semilla',
      description: 'Envuelto en nori o en semilla. Cámbialo a roll de 9 a 10 cortes por $300.',
      image: '/img/nori-pollo.jpg',
      optionGroups: [envoltura, FORMATO_HANDROLL],
    },
    [
      { name: 'Pollo, queso crema, palta', price: 3200, image: '/img/nori-pollo.jpg' },
      { name: 'Pollo, queso crema, cebollín', price: 3100, image: '/img/nori-pollo.jpg' },
      { name: 'Pollo, queso crema, pimentón', price: 3200, image: '/img/nori-pollo.jpg' },
      { name: 'Pollo, queso crema, aceituna', price: 3300, image: '/img/nori-pollo.jpg' },
      { name: 'Pollo, queso crema, champiñón', price: 3300, image: '/img/nori-pollo.jpg' },
      { name: 'Salmón, queso crema, palta', price: 3600, image: '/img/nori-salmon.jpg' },
      { name: 'Salmón, queso crema, cebollín', price: 3500, image: '/img/nori-salmon.jpg' },
      { name: 'Camarón furay, queso crema, palta', price: 3400, image: '/img/nori-camaron.jpg' },
      { name: 'Camarón furay, queso crema, cebollín', price: 3300, image: '/img/nori-camaron.jpg' },
      { name: 'Kanikama, queso crema, palta', price: 2900, image: '/img/nori-kanikama.jpg' },
      { name: 'Kanikama, queso crema, cebollín', price: 2800, image: '/img/nori-kanikama.jpg' },
    ]
  );

  category(
    {
      name: 'Rolls Avocado',
      description: '10 cortes envueltos en palta.',
      image: '/img/avocado-pollo.jpg',
    },
    [
      { name: 'Pollo, queso crema, cebollín', price: 5000, image: '/img/avocado-pollo.jpg', featured: true },
      { name: 'Pollo, queso crema, pimentón', price: 5000, image: '/img/avocado-pollo.jpg' },
      { name: 'Pollo, queso crema, palmito', price: 4800, image: '/img/avocado-pollo.jpg' },
      { name: 'Pollo, queso crema, champiñón', price: 4600, image: '/img/avocado-pollo.jpg' },
      { name: 'Pollo, queso crema, aceituna', price: 4600, image: '/img/avocado-pollo.jpg' },
      { name: 'Salmón, queso crema, palmito', price: 5200, image: '/img/avocado-salmon.jpg' },
      { name: 'Salmón, queso crema, cebollín', price: 5200, image: '/img/avocado-salmon.jpg' },
      { name: 'Salmón, queso crema', price: 5000, image: '/img/avocado-salmon.jpg' },
      { name: 'Camarón furay, queso crema, palmito', price: 5100, image: '/img/avocado-camaron.jpg' },
      { name: 'Camarón furay, queso crema, cebollín', price: 5100, image: '/img/avocado-camaron.jpg' },
      { name: 'Kanikama, queso crema, cebollín', price: 4500, image: '/img/avocado-kanikama.jpg' },
      { name: 'Kanikama, queso crema, palta', price: 4800, image: '/img/avocado-kanikama.jpg' },
    ]
  );

  category(
    {
      name: 'Rolls Queso Crema',
      description: '10 cortes envueltos en queso crema.',
      image: '/img/crema-pollo.jpg',
    },
    [
      { name: 'Pollo, cebollín, palta', price: 4700, image: '/img/crema-pollo.jpg' },
      { name: 'Pollo, pimentón, palta', price: 4600, image: '/img/crema-pollo.jpg' },
      { name: 'Pollo, cebollín, pimentón', price: 4500, image: '/img/crema-pollo.jpg' },
      { name: 'Pollo, palmito, champiñón', price: 4600, image: '/img/crema-pollo.jpg' },
      { name: 'Pollo, aceituna, champiñón', price: 4700, image: '/img/crema-pollo.jpg' },
      { name: 'Salmón, palmito, cebollín', price: 5000, image: '/img/crema-salmon.jpg' },
      { name: 'Salmón, palta, cebollín', price: 5000, image: '/img/crema-salmon.jpg' },
      { name: 'Camarón furay, palta, cebollín', price: 4800, image: '/img/crema-camaron.jpg' },
      { name: 'Camarón furay, palta', price: 4600, image: '/img/crema-camaron.jpg' },
      { name: 'Kanikama, cebollín, palta', price: 4700, image: '/img/crema-kanikama.jpg' },
      { name: 'Kanikama, palta', price: 4500, image: '/img/crema-kanikama.jpg' },
    ]
  );

  const proteinas = (n) => ({
    id: id(),
    name: n === 1 ? 'Elige 1 proteína' : `Elige ${n} proteínas`,
    min: n,
    max: n,
    options: optList(PROTEINAS),
  });
  const vegetales = (n, extra = []) => ({
    id: id(),
    name: `Elige ${n} vegetales`,
    min: n,
    max: n,
    options: optList([...VEGETALES, ...extra]),
  });
  const extraSalmon = () => ({ id: id(), name: 'Extras', min: 0, max: 1, options: [SALMON] });

  category(
    {
      name: 'Gohan',
      description: 'Bowl de arroz. Todos llevan queso base.',
      image: '/img/gohan.jpg',
    },
    [
      {
        name: 'Gohan 1x3',
        description: '1 proteína y 3 vegetales, con queso base.',
        price: 6000,
        image: '/img/gohan.jpg',
        featured: true,
        optionGroups: [proteinas(1), vegetales(3), extraSalmon()],
      },
      {
        name: 'Gohan 2x2',
        description: '2 proteínas y 2 vegetales, con queso base.',
        price: 6500,
        image: '/img/gohan.jpg',
        optionGroups: [proteinas(2), vegetales(2), extraSalmon()],
      },
    ]
  );

  category(
    {
      name: 'Sushiburger',
      description: 'Hamburguesa de arroz apanada. Todas llevan queso base.',
      image: '/img/sushiburger.jpg',
    },
    [
      {
        name: 'Sushiburger 1x3',
        description: '1 proteína y 3 vegetales, con queso base.',
        price: 6300,
        image: '/img/sushiburger.jpg',
        featured: true,
        optionGroups: [proteinas(1), vegetales(3, ['Choclo']), extraSalmon()],
      },
      {
        name: 'Sushiburger 2x2',
        description: '2 proteínas y 2 vegetales, con queso base.',
        price: 6800,
        image: '/img/sushiburger.jpg',
        optionGroups: [proteinas(2), vegetales(2, ['Choclo']), extraSalmon()],
      },
    ]
  );

  category(
    {
      name: 'Sushipleto',
      description: 'El completo de sushi, con papas fritas. Todos llevan queso base.',
      image: '/img/sushipleto.jpg',
    },
    [
      {
        name: 'Sushipleto 1x2 + papas fritas',
        description: '1 proteína y 2 vegetales, con queso base y papas fritas.',
        price: 4500,
        image: '/img/sushipleto.jpg',
        featured: true,
        badge: 'Nuevo',
        optionGroups: [
          { id: id(), name: 'Elige 1 proteína', min: 1, max: 1, options: optList(['Pollo furay', 'Camarón furay']) },
          {
            id: id(),
            name: 'Elige 2 vegetales',
            min: 2,
            max: 2,
            options: optList(['Palta', 'Cebollín', 'Champiñón', 'Pimentón', 'Aceitunas']),
          },
          extraSalmon(),
        ],
      },
    ]
  );

  category(
    {
      name: 'Handrolls Vegetales',
      description: 'Opciones sin proteína animal: en nori o semilla, panko, envoltura palta o en crema.',
      image: '/img/veg-nori.jpg',
    },
    [
      ...[
        ['Palta, queso crema, cebollín', 3000],
        ['Palta, queso crema, pimentón', 2800],
        ['Choclo, queso crema, palta', 3000],
        ['Aceituna, champiñón, palmito', 2800],
        ['Aceituna, queso crema, champiñón', 3000],
        ['Palta, palmito, champiñón', 3000],
      ].map(([name, price]) => ({
        name: `${name} (nori o semilla)`,
        price,
        image: '/img/veg-nori.jpg',
        optionGroups: [{ ...envoltura, id: id() }],
      })),
      ...[
        ['Palta, queso crema, cebollín', 3600],
        ['Palta, queso crema, pimentón', 3400],
        ['Choclo, queso crema, palta', 3400],
        ['Aceituna, champiñón, palmito', 3600],
        ['Aceituna, queso crema, champiñón', 3600],
        ['Palta, palmito, champiñón', 3300],
      ].map(([name, price]) => ({ name: `${name} (panko)`, price, image: '/img/veg-panko.jpg' })),
      ...[
        ['Cebollín, queso crema', 4000],
        ['Pimentón, queso crema', 4000],
        ['Choclo, queso crema', 4000],
        ['Aceituna, queso crema, champiñón', 4400],
        ['Aceituna, champiñón, palmito', 4400],
        ['Palmito, champiñón, queso crema', 4400],
      ].map(([name, price]) => ({ name: `${name} (envoltura palta)`, price, image: '/img/veg-palta.jpg' })),
      ...[
        ['Palta, cebollín', 4200],
        ['Palta, pimentón', 3500],
        ['Choclo, palta', 3500],
        ['Aceituna, champiñón', 3700],
        ['Aceituna, champiñón, palmito', 3900],
        ['Palta, palmito, champiñón', 3900],
      ].map(([name, price]) => ({ name: `${name} (envoltura en crema)`, price, image: '/img/veg-crema.jpg' })),
    ]
  );

  return {
    version: 1,
    settings: {
      name: 'Majori Sushi',
      branch: 'Los Laureles',
      slogan: 'Explosión de sabores',
      heroTitle: 'Sushi hecho al momento, con explosión de sabores',
      heroSubtitle:
        'Handrolls, rolls, tablas para compartir, gohan, sushiburger y el nuevo sushipleto. Pide por WhatsApp y retira en el Strip Center o recibe en tu casa.',
      heroImage: '/img/sushipleto.jpg',
      logo: '/img/logo.png',
      phone: '+56 9 5278 7582',
      whatsapp: '56952787582',
      instagram: 'majori_loslaureles',
      address: 'Strip Center Paseo Los Laureles, poste 49',
      addressNote: 'Ven a buscar tu pedido o pide delivery.',
      mapsQuery: 'Strip Center Paseo Los Laureles',
      hours: [
        { day: 'Lunes', open: '09:00', close: '21:00', closed: false },
        { day: 'Martes', open: '09:00', close: '21:00', closed: false },
        { day: 'Miércoles', open: '09:00', close: '21:00', closed: false },
        { day: 'Jueves', open: '09:00', close: '21:00', closed: false },
        { day: 'Viernes', open: '09:00', close: '21:00', closed: false },
        { day: 'Sábado', open: '09:00', close: '21:00', closed: false },
        { day: 'Domingo', open: '09:00', close: '21:00', closed: false },
      ],
      paymentNotice: 'Se debe realizar la transferencia antes de empezar el pedido.',
      bankInfo: '',
      deliveryEnabled: true,
      deliveryNote: 'Delivery disponible. El costo de envío se confirma por WhatsApp según tu dirección.',
      pickupEnabled: true,
      announcement: {
        enabled: true,
        text: '¡Agenda tu pedido por WhatsApp! Transferencia antes de empezar a preparar.',
      },
      aboutTitle: 'Majori Sushi Los Laureles',
      aboutText:
        'Somos un local de sushi en el Strip Center Paseo Los Laureles. Preparamos cada pedido al momento: handrolls en panko, nori o semilla, rolls envueltos en palta o queso crema, tablas para compartir y creaciones de la casa como el gohan, la sushiburger y el sushipleto. Agenda tu pedido y disfruta la explosión de sabores.',
      colors: { primary: '#d62828', accent: '#e9a23b' },
    },
    categories,
    products,
    orders: [],
    orderCounter: 1000,
    users: [],
  };
}

module.exports = { buildSeed };
