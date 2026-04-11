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

## Semana 2 - Validar FK antes de crear/actualizar

### Problema
Si se envía un `categoryId` que no existe, Prisma lanza un error de
constraint a nivel de DB (código P2003). Es mejor interceptarlo antes
y devolver un 404 claro al cliente.

### Patrón — helper privado en el servicio

```typescript
private async validateCategoryExists(categoryId: number) {
  const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundException(`Categoría con id ${categoryId} no encontrada`);
}
```

### Dónde llamarlo

```typescript
async create(data: CreateProductDto) {
  await this.validateCategoryExists(data.categoryId);       // siempre requerido
  return this.prisma.product.create({ data });
}

async replace(id: number, data: ReplaceProductDto) {
  await this.findOne(id);
  await this.validateCategoryExists(data.categoryId);       // siempre requerido en PUT
  return this.prisma.product.update({ where: { id }, data });
}

async patch(id: number, data: UpdateProductDto) {
  await this.findOne(id);
  if (data.categoryId !== undefined)                        // opcional en PATCH
    await this.validateCategoryExists(data.categoryId);
  return this.prisma.product.update({ where: { id }, data });
}
```

### Regla clave
En `patch` (PATCH), `categoryId` es opcional — solo validar si viene en el body.
En `create` y `replace` (POST/PUT), `categoryId` es obligatorio — siempre validar.

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | Sin este helper, Prisma lanza P2003 con un mensaje técnico que llega al cliente como 500 |
| 2 | El helper usa `findUnique` (no `findFirst`) porque `id` es PK — es más eficiente |
| 3 | Extraer la validación a un método privado evita duplicar código en `create`, `replace` y `patch` |

### Prompt reutilizable

```
En src/[entidad]/[entidad].service.ts, en los métodos create, replace y patch,
valida que [fk_field] exista usando this.prisma.[relacion].findUnique({ where: { id: data.[fk_field] } }).
Si no existe, lanza NotFoundException con el mensaje "[Entidad] con id ${data.[fk_field]} no encontrada".
En patch, solo valida si [fk_field] está presente en el body.
```

---

## Semana 2 - DELETE y 204 No Content

### Comportamiento correcto en el controller

El método `remove` no debe usar `return` — solo `await`:

```typescript
@Delete(':id')
@HttpCode(204)
async remove(@Param('id', ParseIntPipe) id: number) {
  await this.productsService.remove(id);  // sin return
}
```

Sin `return`, NestJS no serializa ningún body y envía la respuesta 204 vacía.

### Lo que ves en Postman

Postman muestra el número de línea del body vacío (e.g. `1`) — **no es un body real**.
Es el indicador de línea del panel de respuesta vacío. Es comportamiento correcto.

---

## Seeding con Prisma 7

### Por qué tsx y no ts-node

Prisma 7 genera el cliente en `generated/prisma/` con archivos `.ts` que usan imports `.js` (convención ESM de TypeScript). `ts-node` en modo CommonJS no resuelve esos imports y falla con `Cannot find module './internal/class.js'`. `tsx` maneja ambos formatos sin configuración adicional.

### Configurar el seed

El comando va en `prisma.config.ts` (Prisma 7 ignora `package.json` para esto):

```typescript
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",
},
```

### Estructura del seed

```typescript
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Limpiar antes de insertar (idempotente)
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  await prisma.category.create({
    data: {
      name: 'Electrónica',
      products: { create: [/* array de productos */] },
    },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

### Correr el seed

```bash
npx prisma db seed
```

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `ts-node` falla con Prisma 7 — usar `tsx` |
| 2 | El seed va en `prisma.config.ts → migrations.seed`, no en `package.json` |
| 3 | `PrismaClient` requiere el adapter igual que en `PrismaService` |
| 4 | El import es desde `'../generated/prisma/client'` (con `/client` al final) |
| 5 | Llamar `deleteMany` en orden hijo → padre para respetar las FK |

### Prompt reutilizable

```
Crea un seed en prisma/seed.ts que pueble la DB con datos de prueba:
- [lista de entidades y datos]
Usa tsx (no ts-node). Configura el comando en prisma.config.ts → migrations.seed.
El seed debe ser idempotente: borrar todo antes de insertar.
```

---

## Paginación con skip/take

### Concepto

`skip` descarta los primeros N registros; `take` limita cuántos se devuelven.
Juntos implementan paginación offset estándar: `skip = (page - 1) * limit`.

### Patrón en el servicio

```typescript
async findAll(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    this.prisma.product.findMany({ where, skip, take: limit, include: { category: true } }),
    this.prisma.product.count({ where }),   // mismo where para totales correctos
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

`Promise.all` ejecuta ambas queries en paralelo — más eficiente que secuencial.
El `count` recibe el mismo `where` que `findMany` para que `total` y `totalPages`
reflejen los resultados filtrados, no el total de la tabla.

### Patrón en el controller

```typescript
@Get()
async findAll(
  @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
) {
  return this.productsService.findAll(page, limit);
}
```

`ParseIntPipe({ optional: true })` convierte el string del query param a número
y no lanza error si el param no viene — el default lo maneja el servicio.

### Respuesta

```json
{ "data": [...], "total": 25, "page": 2, "limit": 10, "totalPages": 3 }
```

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `count` debe recibir el mismo `where` que `findMany` — sin esto `totalPages` es incorrecto cuando hay filtros activos |
| 2 | Los defaults (`page=1`, `limit=10`) van en el servicio, no en el controller |
| 3 | `ParseIntPipe` sin `optional: true` lanza 400 si el param no viene |

### Prompt reutilizable

```
En src/[entidad]/[entidad].service.ts modifica findAll para aceptar page y limit
como parámetros opcionales (default: page=1, limit=10). Usar skip: (page-1)*limit
y take: limit en findMany. Ejecutar findMany y count en paralelo con Promise.all.
Retornar { data, total, page, limit, totalPages }.

En el controller agrega @Query('page') y @Query('limit') con ParseIntPipe({ optional: true }).
```

---

## Filtros dinámicos con where object

### Concepto

Construir el objeto `where` de Prisma condicionalmente con spread — solo se incluyen
las propiedades cuyos valores están definidos. Así una query sin filtros devuelve
todo, y cada filtro que llega se aplica de forma aditiva (AND implícito de Prisma).

### Patrón

```typescript
const where = {
  // Filtro exacto por FK
  ...(categoryId !== undefined && { categoryId }),

  // Filtro de rango — solo incluir si al menos uno de los dos viene
  ...(minPrice !== undefined || maxPrice !== undefined
    ? {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }
    : {}),

  // Búsqueda de texto — OR entre campos, insensible a mayúsculas
  ...(search !== undefined && {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ],
  }),
};
```

### Query params en el controller

```typescript
@Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
@Query('minPrice',   new ParseFloatPipe({ optional: true })) minPrice?: number,
@Query('maxPrice',   new ParseFloatPipe({ optional: true })) maxPrice?: number,
@Query('search') search?: string,
```

- Enteros → `ParseIntPipe({ optional: true })`
- Decimales → `ParseFloatPipe({ optional: true })`
- Strings → `@Query('param')` directo, sin pipe

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `mode: 'insensitive' as const` es necesario — sin el cast TypeScript no acepta el literal |
| 2 | `price: { gte, lte }` solo se agrega si viene al menos uno de los dos; sin esta guarda, se agrega `price: {}` que Prisma ignora pero es ruido |
| 3 | Todos los filtros son AND implícito — Prisma los combina solo |
| 4 | El mismo `where` debe pasarse tanto a `findMany` como a `count` |

### Prompt reutilizable

```
En src/[entidad]/[entidad].service.ts modifica findAll para aceptar estos filtros opcionales:
- [campo FK]?: number → filtrar por FK exacta
- minPrice?: number / maxPrice?: number → rango de precio con gte/lte
- search?: string → contains insensitive en [campo1] y [campo2]

Construir el objeto where dinámicamente: solo incluir la propiedad si el valor no es undefined.
Pasar el mismo where a findMany y a count.

En el controller agregar los @Query params con ParseIntPipe/ParseFloatPipe donde corresponda.
```

---

## Swagger en NestJS

### Instalación

```bash
npm install @nestjs/swagger
```

### Setup en main.ts

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Ecommerce API')
  .setDescription('API para gestión de productos y categorías')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

La UI queda disponible en `http://localhost:3000/api`.

### Decoradores esenciales

**Agrupar endpoints por tag (en el controller):**
```typescript
import { ApiTags } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {}
```

**Documentar campos de DTO:**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Laptop gamer' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Precio en COP', example: 2500000 })
  @IsNumber()
  price: number;
}
```

Solo decorar el DTO base (`CreateDto`). Los DTOs derivados (`ReplaceDto`, `UpdateDto`) heredan `@ApiProperty` automáticamente.

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `@ApiProperty` va en el DTO base — `PartialType` y `extends` propagan los decoradores |
| 2 | Sin `@ApiProperty`, Swagger muestra el schema vacío (los campos no aparecen) |
| 3 | `SwaggerModule.setup` debe ir antes de `app.listen` |
| 4 | La ruta `'api'` en `setup` se convierte en `/api` — no agregar `/` al inicio |

### Prompt reutilizable

```
Integra Swagger en este proyecto NestJS:
1. Instalar @nestjs/swagger
2. En main.ts configurar SwaggerModule con title, description y version. Ruta: /api
3. Agregar @ApiTags('[tag]') en los controllers
4. Agregar @ApiProperty({ description, example }) a todos los campos del DTO base de [entidad]
```

---

## Validación de variables de entorno con Joi

### Instalación

```bash
npm install joi
```

### Crear el schema de validación

`src/config/env.validation.ts`:
```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
});
```

### Conectar al ConfigModule

```typescript
// src/app.module.ts
import { envValidationSchema } from './config/env.validation';

ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
}),
```

### Comportamiento

- Si falta una variable `required`, la app no arranca:
  ```
  Error: Config validation error: "DATABASE_URL" is required
  ```
- Si `PORT` no viene en el `.env`, Joi aplica el `default(3000)` automáticamente.
- La validación ocurre antes de que cualquier módulo se inicialice.

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | Importar Joi con `import * as Joi from 'joi'` — no `import Joi from 'joi'` (no tiene default export) |
| 2 | El schema solo valida las variables declaradas — variables extra se ignoran por defecto |
| 3 | `Joi.number().default(3000)` aplica el default solo si la variable está ausente; si viene vacía (`PORT=`), Joi la rechaza |
| 4 | Probar comentando `DATABASE_URL` en `.env` y corriendo la app — debe fallar con mensaje claro |

### Prompt reutilizable

```
Agrega validación de variables de entorno con Joi:
1. Instalar joi
2. Crear src/config/env.validation.ts con schema Joi que valide:
   - PORT: número, opcional, default 3000
   - DATABASE_URL: string, obligatorio
   - [otras vars]: ...
3. En app.module.ts pasar validationSchema al ConfigModule
```

---

## Autenticación JWT en NestJS

### Instalación

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

### Flujo completo

```
POST /auth/register
  → AuthService.register()
      → UsersService.findByEmail()    # verificar duplicado
      → bcrypt.hash(password, 10)     # nunca guardar password plano
      → UsersService.create()
      → retornar usuario sin password

POST /auth/login
  → AuthService.login()
      → UsersService.findByEmail()    # usuario existe?
      → bcrypt.compare()              # password válida?
      → user.isActive === true?       # cuenta habilitada?
      → jwtService.sign({ sub, email, role })
      → retornar { access_token }

GET /ruta-protegida (Authorization: Bearer <token>)
  → JwtAuthGuard.canActivate()
      → ¿isPublic? → sí → pasar
      → PassportStrategy.validate()   # verificar firma + extraer payload
      → req.user = { id, email, role }
  → RolesGuard.canActivate()
      → ¿requiredRoles? → no → pasar
      → req.user.role in requiredRoles? → sí → pasar / no → 403
```

### JwtStrategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### AuthModule

```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
```

`JwtModule.registerAsync` es necesario para leer `JWT_SECRET` desde `ConfigService` (que depende de `ConfigModule`). Si se usara `JwtModule.register({ secret: '...' })` se hardcodearía el secreto.

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `secretOrKey: configService.get<string>('JWT_SECRET') as string` — el cast es necesario porque `get()` puede retornar `undefined` y el tipo de passport-jwt lo rechaza |
| 2 | `JwtStrategy` debe ser provider en `AuthModule`, no en `AppModule` |
| 3 | `UsersModule` debe exportar `UsersService` para que `AuthModule` pueda inyectarlo |
| 4 | Nunca retornar `password` en las respuestas — usar destructuring: `const { password: _, ...result } = user` |
| 5 | `bcrypt.hash(password, 10)` — el segundo argumento es el número de salt rounds; 10 es el valor estándar |

### Prompt reutilizable

```
Implementa autenticación JWT en este proyecto NestJS:
- UsersModule con UsersService (findByEmail, findById, create) — sin controller
- AuthModule con AuthService (register hashea con bcrypt, login valida y genera JWT)
- JwtStrategy que extrae Bearer token y retorna { id, email, role } en req.user
- JwtAuthGuard que omite validación en rutas @Public()
- Registra JwtAuthGuard y RolesGuard como APP_GUARD globales en AppModule
- Agrega JWT_SECRET a la validación Joi y al .env.example
```

---

## Guards y Roles

### Decoradores

```typescript
// src/common/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/common/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### JwtAuthGuard con soporte @Public()

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### RolesGuard

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para realizar esta acción');
    }
    return true;
  }
}
```

### Registro global en AppModule

```typescript
import { APP_GUARD } from '@nestjs/core';

providers: [
  AppService,
  { provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º — autentica
  { provide: APP_GUARD, useClass: RolesGuard },     // 2º — autoriza
],
```

El orden importa: si `RolesGuard` corre antes de `JwtAuthGuard`, `req.user` aún no existe.

### Uso en controllers

```typescript
@Public()           // sin token requerido
@Get()
findAll() { ... }

@Roles('ADMIN')     // requiere token válido con role === 'ADMIN'
@Post()
create() { ... }
```

### Tabla de permisos por rol

| Acción | GUEST (sin token) | USER | ADMIN |
|--------|-------------------|------|-------|
| Leer productos/categorías | ✅ | ✅ | ✅ |
| Crear/editar/eliminar productos | ❌ 401 | ❌ 403 | ✅ |
| Crear/editar/eliminar categorías | ❌ 401 | ❌ 403 | ✅ |
| Registrarse / hacer login | ✅ | ✅ | ✅ |

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | `getAllAndOverride` busca en el handler primero, luego en la clase — el decorador más específico gana |
| 2 | Sin `@Public()`, todos los endpoints requieren token válido (por el guard global) |
| 3 | `RolesGuard` confía en `req.user` que pone `JwtAuthGuard` — si el orden se invierte, `user` es `undefined` |
| 4 | Rutas de auth (`/auth/register`, `/auth/login`) necesitan `@Public()` explícitamente o quedan bloqueadas por el guard global |

### Prompt reutilizable

```
Agrega protección de endpoints con JwtAuthGuard y RolesGuard:
1. Decorador @Public() en src/common/decorators/public.decorator.ts
2. Decorador @Roles() en src/common/decorators/roles.decorator.ts
3. RolesGuard en src/common/guards/roles.guard.ts — lanza 403 si el rol no coincide
4. Modifica JwtAuthGuard para omitir validación en rutas @Public()
5. Registra ambos guards como APP_GUARD en AppModule (JwtAuthGuard primero)
6. En [Controller]: GET → @Public(), escritura → @Roles('ADMIN')
```

---

## Relación One-to-One en Prisma

### Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  profile   Profile?           // opcional — un User puede no tener Profile
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Profile {
  id        Int     @id @default(autoincrement())
  phone     String?
  address   String?
  docType   String?
  docNumber String?
  userId    Int     @unique      // @unique convierte la FK en One-to-One
  user      User    @relation(fields: [userId], references: [id])
}
```

La clave del One-to-One es `@unique` en la FK (`userId`). Sin ese modificador, sería una relación One-to-Many.

### Diferencia con One-to-Many

| | One-to-Many | One-to-One |
|---|-------------|------------|
| FK en el lado "muchos" | ✅ | ✅ |
| `@unique` en la FK | ❌ | ✅ obligatorio |
| Campo inverso | `Product[]` (array) | `Profile?` (opcional, sin array) |

### Consultar con include

```typescript
// User con su perfil
this.prisma.user.findUnique({
  where: { id },
  include: { profile: true },
})

// Profile con su user
this.prisma.profile.findUnique({
  where: { userId: id },
  include: { user: true },
})
```

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | Sin `@unique` en la FK, Prisma trata la relación como One-to-Many y el campo inverso es un array |
| 2 | `profile Profile?` con `?` significa que Prisma no la incluye por defecto — necesitas `include: { profile: true }` |
| 3 | Al crear un User con perfil anidado, usar `create: { profile: { create: {...} } }` |
| 4 | Si un User no tiene Profile, el campo `profile` retorna `null` (no lanza error) |

### Prompt reutilizable

```
Agrega al schema de Prisma una relación One-to-One entre [ModeloA] y [ModeloB]:
- [ModeloA] tiene un campo opcional [modeloB] [ModeloB]?
- [ModeloB] tiene userId Int @unique y la @relation correspondiente
Crea la migración y regenera el cliente.
```

---

## upsert en Prisma — insert or update idempotente

### Concepto

`upsert` combina `create` + `update` en una sola operación atómica:
- Si el registro **no existe** → ejecuta `create`
- Si el registro **ya existe** → ejecuta `update`

Ideal para seeds y operaciones de sincronización donde quieres garantizar un estado sin importar si ya existe.

### Sintaxis

```typescript
await prisma.user.upsert({
  where:  { email: 'admin@ecommerce.com' },   // condición de búsqueda
  create: { email: 'admin@ecommerce.com', password: hashed, role: 'ADMIN' },
  update: { password: hashed, role: 'ADMIN' }, // qué actualizar si ya existe
});
```

### Uso en el seed

```typescript
const hashed = await bcrypt.hash('Admin123!', 10);

await prisma.user.upsert({
  where:  { email: 'admin@ecommerce.com' },
  update: { password: hashed, role: 'ADMIN', isActive: true },
  create: { email: 'admin@ecommerce.com', password: hashed, role: 'ADMIN', isActive: true },
});
```

Comparado con `deleteMany` + `create` (que borra todo antes), `upsert` **preserva registros existentes** que no están en el seed (útil para datos de producción).

### ⚠️ Gotchas
| # | Gotcha |
|---|--------|
| 1 | El campo en `where` debe tener `@unique` en el schema — de lo contrario Prisma lanza error |
| 2 | `update` no necesita todos los campos, solo los que quieres actualizar |
| 3 | `create` sí necesita todos los campos obligatorios |
| 4 | A diferencia de `deleteMany` + `create`, `upsert` no borra registros que no estén en la lista |

### Prompt reutilizable

```
En prisma/seed.ts reemplaza los create de [modelo] por upsert para que
el seed sea idempotente. Usar [campo único] como clave en where.
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
