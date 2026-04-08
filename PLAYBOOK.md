# NestJS + Claude Code — Playbook de Prompts

Prompts reutilizables para desarrollar esta API. Ajusta los nombres de entidad según el módulo que estés creando.

---

## Inicio

```
Analiza este proyecto NestJS y dime qué archivos tiene, su estructura, y qué está implementado hasta ahora.
```

```
Crea el CLAUDE.md inicial para este proyecto NestJS con los comandos de desarrollo, arquitectura general y configuración de TypeScript relevante.
```

```
Configura el manejo de variables de entorno con @nestjs/config:
- archivo .env con PORT=3000
- archivo .env.example sin valores reales para commitear
- ConfigModule registrado globalmente en AppModule
- main.ts leyendo el puerto desde ConfigService
```

---

## Módulos

```
Crea el módulo de [entidad] con su controlador y servicio siguiendo la arquitectura NestJS estándar.
Por ahora sin base de datos, solo la estructura base con un array en memoria como datos de prueba.
```

```
El endpoint PUT está haciendo lo que debería hacer PATCH. Aplica las buenas prácticas REST:
- PUT debe requerir todos los campos y reemplazar el recurso completo
- PATCH debe aceptar campos parciales y actualizar solo los que lleguen
Implementa ambos correctamente.
```

---

## Validación

```
Crea los DTOs para el módulo de [entidad] usando class-validator con estas reglas de negocio:

Create[Entidad]Dto:
- nombre: string, obligatorio, no puede ser vacío
- precio: number, obligatorio, debe ser mayor a 0
- stock: number, obligatorio, debe ser entero y mayor o igual a 0

Update[Entidad]Dto (para PATCH):
- todos los campos opcionales pero con las mismas reglas si se envían

Replace[Entidad]Dto (para PUT):
- mismos campos que Create, todos obligatorios

También instala las dependencias necesarias y conecta los DTOs al controlador.
```

```
Personaliza los mensajes de validación de todos los DTOs de [entidad] en español, con mensajes
claros para el usuario final. Por ejemplo:
- name vacío → "El nombre es obligatorio"
- price negativo → "El precio debe ser mayor a 0"
- stock no entero → "El stock debe ser un número entero"
Aplica el mismo criterio para todos los demás campos y DTOs.
```

---

## Base de datos

```
Integra Prisma con PostgreSQL en este proyecto NestJS:
- instala las dependencias necesarias
- crea el schema de Prisma para el modelo [Entidad] con los campos: [lista de campos]
- crea un PrismaService que extienda PrismaClient y se registre como provider global
- reemplaza el array en memoria de [Entidad]Service con llamadas reales a Prisma
- actualiza .env.example con DATABASE_URL
```

```
Crea la migración inicial de Prisma y aplícala a la base de datos local.
```

```
Agrega el campo [campo] al modelo [Entidad] en el schema de Prisma, crea la migración
correspondiente y actualiza el DTO y el servicio.
```

---

## Autenticación

```
Implementa autenticación JWT en este proyecto NestJS con @nestjs/jwt y @nestjs/passport:
- módulo AuthModule con registro e inicio de sesión
- UsersModule con usuario almacenado (en memoria por ahora)
- JwtStrategy que valide el token en el header Authorization
- JwtAuthGuard reutilizable
- rutas públicas con un decorador @Public()
- protege todos los endpoints de [entidad] excepto GET
```

```
Agrega un decorador @Roles() y un RolesGuard para proteger endpoints según el rol del usuario.
Los roles disponibles son: [admin, user, ...].
```

---

## Errores

```
Crea un filtro global de excepciones que estandarice todas las respuestas de error con esta estructura:
{
  "statusCode": 404,
  "message": "Recurso no encontrado",
  "timestamp": "2026-04-06T18:30:00Z",
  "path": "/ruta"
}
Cuando haya múltiples errores de validación, devuélvelos como array en un campo "errors".
Registra el filtro globalmente en main.ts.
```

```
Modifica el filtro de excepciones para que cuando haya múltiples errores de validación los devuelva
como array en un campo "errors" en lugar de unirlos en un string:
- un solo mensaje → campo "message" como string
- múltiples errores → "message": "Error de validación" + array "errors"
```

---

## Debug

```
Corre npm run start:dev, revisa los errores que salgan y corrígelos.
```

```
Corre npx tsc --noEmit y corrige todos los errores de TypeScript que aparezcan.
```

```
Tengo este error al correr la aplicación, analízalo y corrígelo:
[pegar error]
```

---

## Integración PostgreSQL + Prisma 7 en NestJS

### Instalación
```bash
npm install @prisma/client @prisma/adapter-pg
npm install -D prisma
```

### Inicializar Prisma
```bash
npx prisma init
```
Genera automáticamente `prisma/schema.prisma` y `prisma.config.ts`.

### Configuración schema.prisma
```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "commonjs"   # ⚠️ obligatorio para NestJS
}

datasource db {
  provider = "postgresql"
  # ⚠️ NO va url aquí — va en prisma.config.ts
}
```

### Configuración prisma.config.ts
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### .env
```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/nombre_db"
```

### Migración y generación del cliente
```bash
npx prisma migrate dev --name init
npx prisma generate   # ⚠️ siempre después de migrate
```

### PrismaService
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client'; // ⚠️ /client al final
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL
    });
    super({ adapter }); // ⚠️ adapter obligatorio en Prisma 7
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### PrismaModule
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ⚠️ evita importar PrismaModule en cada módulo
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Registrar en AppModule
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  PrismaModule,
]
```

### ⚠️ Gotchas Prisma 7
| # | Gotcha |
|---|--------|
| 1 | `moduleFormat = "commonjs"` es obligatorio — sin esto falla con NestJS |
| 2 | `url` NO va en `schema.prisma` — va en `prisma.config.ts` |
| 3 | Siempre correr `prisma generate` después de `prisma migrate` |
| 4 | Import desde `'../../generated/prisma/client'` no desde `@prisma/client` |
| 5 | `PrismaClient` requiere el adapter en el constructor — ver ejemplo en `generated/prisma/client.ts` |

### 💡 Tip
Cuando no recuerdes cómo instanciar `PrismaClient`, el archivo
`generated/prisma/client.ts` siempre tiene el ejemplo correcto.

---

## Comandos útiles en Windows

### Matar un proceso en un puerto específico
```bash
# Ver qué proceso está usando el puerto
netstat -ano | findstr :3000

# Matar el proceso por PID (última columna del comando anterior)
taskkill /PID <numero> /F
```

### Equivalencia con Linux/Mac
```bash
# Windows: taskkill /PID 1234 /F
# Linux/Mac: kill -9 1234
```

---

## Semana 2 - Conectar ProductsService a Prisma

### Cambios en el servicio
- Eliminar array en memoria y nextId
- Inyectar PrismaService en el constructor
- Todos los métodos pasan a ser async
- Eliminar product.interface.ts (Prisma infiere los tipos)

### Patrón del servicio
```typescript
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany();
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
    return product;
  }

  async create(data: CreateProductDto) {
    return this.prisma.product.create({ data });
  }

  async replace(id: number, data: ReplaceProductDto) {
    await this.findOne(id);  // valida existencia primero
    return this.prisma.product.update({ where: { id }, data });
  }

  async patch(id: number, data: UpdateProductDto) {
    await this.findOne(id);  // valida existencia primero
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);  // valida existencia primero
    await this.prisma.product.delete({ where: { id } });
  }
}
```

### Cambios en el controller
- Eliminar import de Product interface
- Todos los métodos async
- Sin tipos de retorno explícitos — TypeScript los infiere desde Prisma

### 💡 Tips
- `findOne` antes de `update`/`delete` garantiza el mismo
  formato de error en toda la app
- Al usar `@Global()` en PrismaModule no necesitas importarlo
  en cada módulo
- Prisma genera el `id` automáticamente — no necesitas nextId manual

---

## Semana 2 - Relaciones One to Many con Prisma 7

### Concepto
La llave foránea (FK) siempre vive en el lado "muchos".
Ejemplo: un Product pertenece a una Category → categoryId vive en Product.

### Schema
```prisma
model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[] // relación inversa — virtual, no crea columna en DB
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  stock       Int
  price       Float
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id])
}
```

### Migración
```bash
npx prisma migrate dev --name add-categories
npx prisma generate
```

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `products Product[]` en Category es virtual — no genera columna en DB |
| 2 | Si hay datos existentes con el campo nuevo obligatorio, la migración falla — usar `Int?` o limpiar la DB primero |
| 3 | El `autoincrement` no se resetea al borrar registros — es comportamiento correcto |
| 4 | Sin `categoryId` en el body el validador rechaza con 400 |

### Flujo de creación con relación
```json
// 1. Primero crear la categoría
POST /categories
{ "name": "Electrónica" }

// 2. Luego crear el producto con categoryId
POST /products
{
  "name": "Laptop",
  "description": "Laptop gamer 16GB RAM",
  "price": 1200,
  "stock": 10,
  "categoryId": 1
}
```

---

## Semana 2 - Queries con `include` en Prisma 7

### Concepto
`include` le indica a Prisma que haga un JOIN y devuelva la relación
anidada dentro del objeto. Sin `include`, solo se devuelven los campos
escalares (e.g., `categoryId` pero no el objeto `category`).

### Casos de uso habituales

```typescript
// Todos los productos con su categoría anidada
this.prisma.product.findMany({
  include: { category: true },
})

// Un producto por id con su categoría
this.prisma.product.findUnique({
  where: { id },
  include: { category: true },
})

// Una categoría con todos sus productos
this.prisma.category.findUnique({
  where: { id },
  include: { products: true },
})
```

### Respuesta resultante

Sin `include`:
```json
{ "id": 1, "name": "Laptop", "categoryId": 2, "price": 1200, "stock": 10, "description": "..." }
```

Con `include: { category: true }`:
```json
{
  "id": 1,
  "name": "Laptop",
  "categoryId": 2,
  "price": 1200,
  "stock": 10,
  "description": "...",
  "category": { "id": 2, "name": "Electrónica" }
}
```

### `include` anidado (relaciones de 2+ niveles)

```typescript
// Categoría → productos → (hipotético) proveedor del producto
this.prisma.category.findMany({
  include: {
    products: {
      include: { supplier: true },
    },
  },
})
```

### `select` dentro de `include` (proyección)

Si no quieres devolver todos los campos de la relación:

```typescript
this.prisma.product.findMany({
  include: {
    category: {
      select: { name: true }, // solo el nombre, no el id
    },
  },
})
```

### Dónde agregar `include` en el servicio

Agrega `include` únicamente en los métodos de lectura (`findAll`, `findOne`).
Los métodos de escritura (`create`, `update`, `delete`) no necesitan
devolver la relación anidada salvo que el cliente lo requiera explícitamente.

```typescript
async findAll() {
  return this.prisma.product.findMany({ include: { category: true } });
}

async findOne(id: number) {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) throw new NotFoundException(`Producto con id ${id} no encontrado`);
  return product;
}
```

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `include` y `select` son mutuamente excluyentes al mismo nivel — no puedes usarlos juntos en la misma query raíz |
| 2 | `include: { category: true }` falla en tiempo de compilación si el campo no está definido como relación en el schema |
| 3 | Incluir relaciones inversas grandes (e.g., `products` en una categoría con miles de productos) puede impactar rendimiento — usa `take`/`skip` o `select` para acotar |
| 4 | El tipo de retorno de Prisma cambia automáticamente al añadir `include` — TypeScript infiere el tipo extendido sin necesidad de tipos manuales |

### Prompt reutilizable

```
En src/[entidad]/[entidad].service.ts agrega include: { [relacion]: true }
a los métodos findAll y findOne para que retornen el objeto
completo de [relacion] en cada [entidad].
```

---

## Extras

```
Actualiza el CLAUDE.md con todos los cambios que hicimos hoy: [lista de cambios].
```

```
Haz un resumen de lo que tiene el proyecto actualmente: módulos, endpoints, validaciones
y decisiones de arquitectura tomadas.
```

```
Revisa todos los archivos del módulo [entidad] y verifica que sigan consistentemente
los patrones establecidos en el proyecto: nombres, estructura de DTOs, manejo de errores.
```
