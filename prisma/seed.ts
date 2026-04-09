import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const categories = [
  {
    name: 'Electrónica',
    products: [
      {
        name: 'Televisor Samsung 55" 4K',
        description: 'Smart TV QLED con resolución 4K, HDR10+ y Tizen OS',
        stock: 15,
        price: 2_890_000,
      },
      {
        name: 'Audífonos Sony WH-1000XM5',
        description: 'Audífonos inalámbricos con cancelación de ruido líder del mercado',
        stock: 30,
        price: 1_150_000,
      },
      {
        name: 'Tablet Lenovo Tab P11',
        description: 'Tablet 11" con pantalla LCD 2K, 4 GB RAM y 128 GB almacenamiento',
        stock: 20,
        price: 980_000,
      },
      {
        name: 'Teclado mecánico Logitech G Pro',
        description: 'Teclado gaming con switches GX Blue, retroiluminación RGB y diseño TKL',
        stock: 25,
        price: 620_000,
      },
      {
        name: 'Cámara web Logitech C920',
        description: 'Webcam Full HD 1080p con micrófono estéreo integrado',
        stock: 40,
        price: 390_000,
      },
    ],
  },
  {
    name: 'Ropa',
    products: [
      {
        name: 'Camiseta deportiva Nike Dri-FIT',
        description: 'Camiseta de entrenamiento con tecnología de gestión de humedad',
        stock: 60,
        price: 129_000,
      },
      {
        name: 'Jeans Levi\'s 511 Slim',
        description: 'Pantalón de mezclilla slim fit, tela elástica para mayor comodidad',
        stock: 45,
        price: 289_000,
      },
      {
        name: 'Chaqueta impermeable The North Face',
        description: 'Chaqueta ligera con membrana DryVent, capucha ajustable y bolsillos con cremallera',
        stock: 20,
        price: 549_000,
      },
      {
        name: 'Vestido casual Zara',
        description: 'Vestido midi de lino con escote en V y tirantes ajustables',
        stock: 35,
        price: 189_000,
      },
      {
        name: 'Medias térmicas Under Armour (pack x3)',
        description: 'Pack de 3 medias de compresión con tecnología HeatGear para clima frío',
        stock: 80,
        price: 89_000,
      },
    ],
  },
  {
    name: 'Hogar',
    products: [
      {
        name: 'Aspiradora Dyson V11',
        description: 'Aspiradora inalámbrica con motor digital de alta potencia y 60 min de autonomía',
        stock: 10,
        price: 2_100_000,
      },
      {
        name: 'Cafetera de espresso Breville Barista Express',
        description: 'Cafetera con molinillo integrado, bomba de 15 bares y vaporizador de leche',
        stock: 12,
        price: 1_890_000,
      },
      {
        name: 'Set de sábanas 100% algodón egipcio',
        description: 'Juego de cama para doble con 400 hilos, suavidad premium y resistencia al lavado',
        stock: 30,
        price: 320_000,
      },
      {
        name: 'Lámpara de pie LED Philips',
        description: 'Lámpara de pie con 3 niveles de intensidad, luz cálida/fría y base antideslizante',
        stock: 25,
        price: 219_000,
      },
      {
        name: 'Olla a presión Imusa 6 L',
        description: 'Olla a presión de aluminio con válvula de seguridad y capacidad de 6 litros',
        stock: 50,
        price: 149_000,
      },
    ],
  },
  {
    name: 'Deportes',
    products: [
      {
        name: 'Bicicleta de montaña Trek Marlin 5',
        description: 'MTB con marco de aluminio, suspensión delantera y 21 velocidades Shimano',
        stock: 8,
        price: 3_200_000,
      },
      {
        name: 'Mancuernas ajustables Bowflex 552',
        description: 'Set de mancuernas ajustables de 2 a 24 kg con selector de peso rápido',
        stock: 15,
        price: 1_750_000,
      },
      {
        name: 'Colchoneta de yoga Manduka PRO',
        description: 'Mat de yoga de 6 mm de grosor, material ecológico y superficie antideslizante',
        stock: 40,
        price: 380_000,
      },
      {
        name: 'Guantes de boxeo Everlast Pro Style',
        description: 'Guantes de boxeo de cuero sintético con relleno de espuma de triple densidad',
        stock: 30,
        price: 175_000,
      },
      {
        name: 'Cuerda para saltar Crossrope Get Lean',
        description: 'Set de cuerdas ponderadas de 0.25 kg y 0.5 kg con mangos ergonómicos',
        stock: 55,
        price: 295_000,
      },
    ],
  },
  {
    name: 'Ferretería',
    products: [
      {
        name: 'Taladro percutor inalámbrico DeWalt 20V',
        description: 'Taladro con motor sin escobillas, 2 baterías de 2 Ah y cargador incluido',
        stock: 18,
        price: 890_000,
      },
      {
        name: 'Juego de llaves combinadas Stanley (20 piezas)',
        description: 'Set de llaves de acero cromo-vanadio de 6 a 24 mm con estuche organizador',
        stock: 35,
        price: 245_000,
      },
      {
        name: 'Nivel láser Bosch GLL 3-80',
        description: 'Nivel láser autonivelante con 3 líneas de 360° y alcance de 30 metros',
        stock: 10,
        price: 1_120_000,
      },
      {
        name: 'Pintura vinílica Tito interior blanca 4 gal',
        description: 'Pintura para interiores de alto rendimiento, lavable y baja en COV',
        stock: 60,
        price: 98_000,
      },
      {
        name: 'Cinta métrica Stanley PowerLock 8 m',
        description: 'Huincha de medir con cinta de acero, freno y carcasa reforzada',
        stock: 100,
        price: 42_000,
      },
    ],
  },
];

async function main() {
  console.log('Limpiando datos existentes...');
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  console.log('Insertando categorías y productos...');

  for (const { name, products } of categories) {
    const category = await prisma.category.create({
      data: {
        name,
        products: {
          create: products,
        },
      },
      include: { products: true },
    });
    console.log(`  ✓ ${category.name} — ${category.products.length} productos`);
  }

  const totalProducts = await prisma.product.count();
  const totalCategories = await prisma.category.count();
  console.log(`\nSeed completado: ${totalCategories} categorías, ${totalProducts} productos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
