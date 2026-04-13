# NestJS + Claude Code — Playbook

> **Proyecto:** ecommerce-api
> **Stack:** NestJS · Prisma 7 · PostgreSQL · TypeScript · JWT
> **Propósito:** referencia técnica y prompts reutilizables para desarrollo asistido por Claude Code.
> **Versión:** `2.1.0`
> **Última actualización:** 2026-04-13
> **Mantenido por:** Doris Mosquera

---

## Índice

1. [Reglas innegociables](#1-reglas-innegociables)
2. [Convenciones del proyecto](#2-convenciones-del-proyecto)
3. [Code review checklist](#3-code-review-checklist)
4. [Reglas para actualizar este playbook](#4-reglas-para-actualizar-este-playbook)
5. [Setup y configuración](#5-setup-y-configuración)
6. Capítulos temáticos
   - 6.1 [Inicio del proyecto](#61-inicio-del-proyecto) ⭐
   - 6.2 [Módulos y arquitectura](#62-módulos-y-arquitectura) ⭐
   - 6.3 [Validación con class-validator](#63-validación-con-class-validator) ⭐
   - 6.4 [Prisma 7: integración base](#64-prisma-7-integración-base) ⭐
   - 6.5 [Prisma 7: relaciones](#65-prisma-7-relaciones) ⭐
   - 6.6 [Prisma 7: queries con include](#66-prisma-7-queries-con-include) ⭐
   - 6.7 [Prisma 7: validación de FK](#67-prisma-7-validación-de-fk) ⭐
   - 6.8 [Prisma 7: seeding](#68-prisma-7-seeding) ⭐
   - 6.9 [Prisma 7: upsert](#69-prisma-7-upsert) ⭐
   - 6.10 [Paginación](#610-paginación) ⭐
   - 6.11 [Filtros dinámicos](#611-filtros-dinámicos) ⭐
   - 6.12 [Autenticación JWT](#612-autenticación-jwt) ⭐
   - 6.13 [Guards y Roles](#613-guards-y-roles) ⭐
   - 6.14 [Manejo de errores](#614-manejo-de-errores) ⭐
   - 6.15 [Swagger](#615-swagger) ⭐
   - 6.16 [Variables de entorno con Joi](#616-variables-de-entorno-con-joi) ⭐
   - 6.17 [Módulo de Perfil (One-to-One)](#617-módulo-de-perfil-one-to-one) ⭐
   - 6.18 [Módulo de Órdenes](#618-módulo-de-órdenes) ⭐
7. [Casos edge conocidos](#7-casos-edge-conocidos)
8. [Tarjetas de estudio](#8-tarjetas-de-estudio)
9. [Comandos útiles (Windows)](#9-comandos-útiles-windows)
10. [Changelog](#10-changelog)

---

## 1. Reglas innegociables

Estas reglas **NUNCA** se rompen en este proyecto. Cualquier cambio que las viole debe ser rechazado en code review, sin excepciones.

| # | Regla | Por qué importa |
|---|-------|-----------------|
| 1 | Mensajes de error siempre en español | Consistencia con el público objetivo (Colombia); afecta UX final del cliente. |
| 2 | Toda lógica transaccional usa `prisma.$transaction(async (tx) => {...})` y dentro **solo `tx`**, nunca `this.prisma` | Usar `this.prisma` dentro de un callback transaccional escapa la transacción y rompe la atomicidad silenciosamente. |
| 3 | Endpoints de escritura (POST/PUT/PATCH/DELETE) protegidos con `@Roles('ADMIN')` salvo justificación explícita en el código | Por defecto, autorización mínima. La excepción debe ser visible. |
| 4 | DTOs de entrada con `class-validator`, mensajes en español | El validador global asume que los DTOs declaran sus reglas; sin esto, los datos sucios llegan al servicio. |
| 5 | `password` nunca se devuelve en respuestas — usar `select` o destructuring | Riesgo de leak de credenciales. Una sola vez basta para comprometer todo. |
| 6 | Validación de FK siempre antes de la operación de Prisma, lanzando 404 con mensaje claro | Sin esto, el cliente recibe un P2003 técnico como 500 y no entiende qué pasó. |
| 7 | Migraciones con datos existentes se hacen con SQL manual + `migrate resolve`, nunca con `migrate dev` directo | `migrate dev` reseteará la DB o fallará; el flujo manual preserva los datos. |
| 8 | Toda operación que modifica stock va dentro de `$transaction` con lock pesimista (`SELECT ... FOR UPDATE`) | Sin lock, dos pedidos concurrentes pueden vender el último producto dos veces (lost update). |
| 9 | Las entidades de Prisma **NUNCA** se devuelven directamente en las respuestas HTTP — siempre vía Response DTO | Acoplar el modelo de dominio al contrato de la API expone campos sensibles y crea fragilidad ante refactors. |
| 10 | Tipos usados en signatures con decoradores se importan con `import type` | Requerido por `isolatedModules` + `emitDecoratorMetadata`. Sin esto, el build falla. |

---

## 2. Convenciones del proyecto

### Naming

- **Archivos:** `kebab-case` (ej: `create-order.dto.ts`, `jwt-auth.guard.ts`)
- **Clases:** `PascalCase` (ej: `OrdersService`, `CreateOrderDto`)
- **Variables y funciones:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE` (ej: `JWT_SECRET`, `IS_PUBLIC_KEY`)
- **Enums de Prisma:** `UPPER_SNAKE_CASE` para los valores (ej: `OrderStatus.PENDING`)

### Estructura de carpetas por feature

```
src/<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
└── dto/
    ├── create-<feature>.dto.ts
    ├── update-<feature>.dto.ts
    └── <feature>-response.dto.ts
```

### Idioma

- **Mensajes de error y validación:** español
- **Comentarios de código:** español
- **Nombres de variables, clases y archivos:** inglés
- **Nombres de modelos en Prisma:** inglés (PascalCase singular)

### Imports

- **Tipos puros** → `import type { Foo } from '...'`
- **Tipos usados en decoradores** (parámetros de métodos) → `import type` (obligatorio)
- **Clases con runtime** (servicios, módulos, DTOs) → `import { Foo } from '...'`

### Manejo de campos opcionales

- En DTOs → `@IsOptional()` + tipo opcional (`field?: string`)
- En Prisma schema → `field String?`
- En servicios → validar con `if (field !== undefined)`, no con `if (field)` (porque `0`, `""`, `false` son válidos)

---

## 3. Code review checklist

Esta es la checklist que debes correr cada vez que Claude Code (u otro agente) te entregue código antes de aceptarlo.

### 🔒 Capa de seguridad

- [ ] ¿Endpoints sensibles tienen `@Roles('ADMIN')`?
- [ ] ¿Hay alguna ruta que debería ser `@Public()` y no lo es?
- [ ] ¿Se devuelve `password` en alguna respuesta? (Buscar `password` en el código generado)
- [ ] ¿Hay datos sensibles en logs o `console.log`?
- [ ] ¿Las rutas de `/auth/*` tienen `@Public()` explícito?

### 🔄 Capa transaccional

- [ ] ¿Las operaciones que tocan múltiples tablas están dentro de `$transaction`?
- [ ] Dentro del callback de `$transaction`, ¿TODAS las queries usan `tx` y no `this.prisma`?
- [ ] ¿Hay race conditions posibles? (validar + escribir sobre el mismo recurso sin lock)
- [ ] ¿Los locks pesimistas se hacen ANTES de las validaciones, no después?
- [ ] ¿Se usa `decrement`/`increment` en lugar de leer-restar-escribir?

### ✅ Capa de validación

- [ ] ¿FKs validadas antes de la query de Prisma para evitar errores P2003?
- [ ] ¿Mensajes de error en español?
- [ ] ¿DTOs con `class-validator` en el controller?
- [ ] ¿`whitelist: true` está activo en `ValidationPipe` global?
- [ ] ¿Las validaciones cubren los casos edge documentados? (ver sección 7)

### 📤 Capa de respuesta

- [ ] ¿Los errores siguen el formato del `HttpExceptionFilter` global?
- [ ] ¿`DELETE` retorna 204 sin body? (sin `return` en el método)
- [ ] ¿Response shapes consistentes? (paginación = `{data, total, page, limit, totalPages}`)
- [ ] ¿Se usa Response DTO en lugar de devolver entidad de Prisma directamente?

### 🏗️ Capa arquitectónica

- [ ] ¿El módulo nuevo está importado en `AppModule` o donde corresponda?
- [ ] ¿Los providers que se usan en otros módulos están en `exports`?
- [ ] ¿`PrismaModule` no se importó manualmente? (es global, no debe re-importarse)
- [ ] ¿Los nombres siguen las convenciones de la sección 2?
- [ ] ¿Los imports usan `import type` donde corresponde?

---

## 4. Reglas para actualizar este playbook

Este documento es **living documentation** — debe evolucionar con el proyecto, pero solo bajo reglas claras.

### Cuándo se actualiza

- ✅ Después de cada sesión de aprendizaje significativa
- ✅ Cada bug raro encontrado y resuelto
- ✅ Cada nueva funcionalidad implementada que establezca un patrón reutilizable
- ✅ Cada vez que se identifica una nueva regla innegociable

### Cuándo NO se actualiza

- ❌ Código one-off que no se va a reutilizar
- ❌ Patrones experimentales no validados
- ❌ Opiniones sin justificación técnica
- ❌ Workarounds temporales

### Quién lo actualiza

- **Doris** manualmente para cambios pequeños (gotcha nuevo, regla nueva)
- **Claude Code** mediante el prompt estándar (ver al final de esta sección) para cambios grandes

### Qué se agrega y dónde

| Tipo de contenido | Dónde va |
|---|---|
| Nuevo patrón técnico | Capítulo nuevo en sección 6 |
| Nuevo gotcha de un patrón existente | Tabla de gotchas del capítulo correspondiente |
| Nuevo bug raro | Sección 7 (Casos edge conocidos) |
| Nueva regla global | Sección 1 (con justificación en columna "Por qué importa") |
| Nueva convención | Sección 2 |
| Nuevo ítem de revisión | Sección 3 |

### Formato obligatorio para capítulos nuevos

Cada capítulo de la sección 6 debe seguir esta estructura interna **sin excepciones**:

```markdown
### 6.X [Nombre del capítulo]

**Concepto.** [Explicación del por qué — 2-4 párrafos máximo. Empieza con el problema que resuelve.]

**Patrón base.**
```código```

**Variantes / casos comunes.** [Si aplica]

**Gotchas.**
| # | Gotcha | Por qué importa |
|---|--------|-----------------|

**Anti-patrones.** [Cosas que NO se deben hacer, con razón]

**Prompt reutilizable.**
```prompt parametrizado```

**Code review específico.**
- [ ] item 1
- [ ] item 2
```

### Después de cada actualización

1. Incrementar la versión en el header siguiendo **semver**:
   - **PATCH** (`2.0.0` → `2.0.1`): correcciones menores, typos, gotcha agregado
   - **MINOR** (`2.0.0` → `2.1.0`): capítulo nuevo, sección nueva, regla nueva
   - **MAJOR** (`2.0.0` → `3.0.0`): reestructura del playbook, cambio de formato base
2. Actualizar la fecha del header
3. Registrar el cambio en la sección 10 (Changelog)

### Prompt estándar para Claude Code (actualización del playbook)

````markdown
# Tarea: Actualizar PLAYBOOK.md

## Contexto
Acabamos de [implementar X / encontrar bug Y / aprender Z] en este proyecto.
Necesito que actualices PLAYBOOK.md siguiendo el estándar definido.

## Qué agregar
[Descripción específica del contenido nuevo]

## Reglas obligatorias
1. Lee primero la sección 4 ("Reglas para actualizar este playbook") y respétala al pie de la letra.
2. Si agregas un capítulo nuevo en la sección 6, sigue la estructura interna estándar:
   Concepto → Patrón base → Variantes → Gotchas (3 columnas) → Anti-patrones → Prompt reutilizable → Code review específico
3. Si agregas a un capítulo existente, mantén el orden y formato interno.
4. Cada gotcha debe tener tres columnas: # | Gotcha | Por qué importa
5. Incrementa la versión en el header siguiendo semver:
   - PATCH para correcciones, MINOR para secciones nuevas, MAJOR para reestructuras.
6. Actualiza la fecha del header.
7. Registra el cambio en la sección 10 (Changelog) con fecha, versión y descripción.
8. NO toques otras secciones del playbook que no sean relevantes a este cambio.
9. Si el cambio implica una nueva regla innegociable, agrégala en la sección 1 con su justificación.

## Después de actualizar
Muéstrame un diff resumido de qué cambiaste antes de guardar.
````

---

## 5. Setup y configuración

### Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto HTTP | `3000` |
| `DATABASE_URL` | Conexión PostgreSQL | — |
| `JWT_SECRET` | Secreto para firmar JWT | — |

### Comandos esenciales

```bash
# Desarrollo
npm run start:dev       # hot reload
npm run start:debug     # con debugger

# Build
npm run build
npm run start:prod

# Calidad
npm run lint
npm run format

# Tests
npm test
npm run test:cov
npm run test:e2e

# Prisma
npx prisma migrate dev --name <nombre>
npx prisma generate
npx prisma studio
npx prisma db seed
```

---

## 6. Capítulos temáticos

### 6.1 Inicio del proyecto ⭐

**Concepto.** Arrancar un proyecto NestJS con Claude Code requiere dos pasos previos a cualquier feature: orientar a Claude Code sobre la estructura actual del proyecto, y crear el archivo `CLAUDE.md` que actúa como memoria persistente entre sesiones. Sin `CLAUDE.md`, Claude Code no tiene contexto del stack, las convenciones ni las decisiones técnicas ya tomadas — cada sesión nueva empieza desde cero y puede proponer cambios inconsistentes.

El siguiente paso fundacional es configurar el manejo de variables de entorno con `@nestjs/config`. Sin esta base, las variables como `DATABASE_URL` y `JWT_SECRET` estarían hardcodeadas o se leerían con `process.env` crudo, sin validación ni tipado. Con `ConfigModule` global, `ConfigService` es inyectable en cualquier módulo sin reimportar el módulo.

**Patrón base.**

```
Analiza este proyecto NestJS y dime qué archivos tiene, su estructura,
y qué está implementado hasta ahora.
```

```
Crea el CLAUDE.md inicial para este proyecto NestJS con los comandos de desarrollo,
arquitectura general y configuración de TypeScript relevante.
```

```
Configura el manejo de variables de entorno con @nestjs/config:
- archivo .env con PORT=3000
- archivo .env.example sin valores reales para commitear
- ConfigModule registrado globalmente en AppModule
- main.ts leyendo el puerto desde ConfigService
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `CLAUDE.md` no se genera automáticamente — hay que crearlo con un prompt explícito al inicio | Sin él, Claude Code re-deriva el contexto del proyecto en cada sesión, lo que puede llevar a propuestas inconsistentes con las decisiones ya tomadas. |
| 2 | `.env` no debe commitearse al repositorio | Expone credenciales reales (DATABASE_URL con contraseña, JWT_SECRET) en el historial de git para siempre — no hay `git rm` que borre un secreto ya publicado. |
| 3 | `.env.example` sí se commitea con placeholder values | Sin él, un colaborador nuevo no sabe qué variables configurar y la app no arranca, sin ningún mensaje de error útil. |

**Anti-patrones.**

- ❌ Hardcodear `PORT` u otras variables directamente en `main.ts`
- ❌ Empezar a construir features sin tener `CLAUDE.md` y `ConfigModule` configurados
- ❌ Commitear `.env` al repositorio

**Prompt reutilizable.**

```
Analiza este proyecto NestJS y:
1. Dime qué archivos tiene y qué está implementado hasta ahora
2. Crea CLAUDE.md con comandos de desarrollo, arquitectura, decisiones técnicas tomadas y configuración de TypeScript relevante
3. Configura @nestjs/config: ConfigModule global en AppModule, .env con PORT=3000,
   .env.example sin valores reales, main.ts leyendo PORT desde ConfigService
```

**Code review específico.**

- [ ] `CLAUDE.md` existe y refleja el estado actual del proyecto
- [ ] `.env` está en `.gitignore`
- [ ] `.env.example` está commiteado con placeholder values
- [ ] `ConfigModule` está en `AppModule` con `isGlobal: true`
- [ ] `main.ts` lee `PORT` desde `ConfigService`, no con `process.env.PORT` crudo

---

### 6.2 Módulos y arquitectura ⭐

**Concepto.** NestJS organiza las funcionalidades en módulos, cada uno con su controlador (routing HTTP), servicio (lógica de negocio) y DTOs (contratos de entrada/salida). Esta separación de responsabilidades hace el código testeable y escalable: el controller no debe tener lógica, el servicio no debe conocer HTTP.

Un error conceptual frecuente es confundir PUT con PATCH. Son semánticas REST distintas: PUT reemplaza el recurso completo (todos los campos son obligatorios), PATCH hace actualización parcial (solo se actualizan los campos que llegan). NestJS implementa esto con dos DTOs distintos: `ReplaceDto extends CreateDto` (hereda los campos obligatorios), y `UpdateDto uses PartialType(CreateDto)` (hace todos los campos opcionales automáticamente).

**Patrón base.**

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

**Variantes / casos comunes.**

Estructura de DTOs para una entidad con PUT y PATCH:

```typescript
// create-product.dto.ts — fuente de verdad
export class CreateProductDto {
  @IsString() name: string;
  @IsNumber() price: number;
}

// replace-product.dto.ts — PUT: hereda todos los campos obligatorios
export class ReplaceProductDto extends CreateProductDto {}

// update-product.dto.ts — PATCH: todos los campos opcionales
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | El módulo nuevo debe importarse en `AppModule` | Sin la importación, los endpoints no existen aunque el archivo esté creado — no hay error de compilación, solo 404. |
| 2 | `PrismaModule` no debe reimportarse en cada feature module | Es `@Global()` — reimportarlo no rompe la app pero genera confusión sobre cuál es la fuente del provider. |
| 3 | `ReplaceDto extends CreateDto` directamente, sin `PartialType` | `PartialType` haría todos los campos opcionales, invalidando la semántica de PUT. |

**Anti-patrones.**

- ❌ Poner lógica de negocio en el controller
- ❌ Usar un solo DTO con campos opcionales tanto para PUT como para PATCH
- ❌ Olvidar registrar el nuevo módulo en `AppModule`

**Prompt reutilizable.**

```
Crea el módulo de [entidad] en src/[entidad]/ con:
- [entidad].module.ts, [entidad].controller.ts, [entidad].service.ts
- Endpoints: GET /, GET /:id, POST /, PUT /:id, PATCH /:id, DELETE /:id
- PUT usa ReplaceDto (todos los campos obligatorios)
- PATCH usa UpdateDto (PartialType — todos opcionales)
- Por ahora sin DB: array en memoria como datos de prueba
- Registrar en AppModule
```

**Code review específico.**

- [ ] El módulo está importado en `AppModule`
- [ ] PUT usa `ReplaceDto` (todos los campos obligatorios, sin `PartialType`)
- [ ] PATCH usa `UpdateDto` con `PartialType(CreateDto)`
- [ ] La lógica está en el servicio, no en el controller
- [ ] Estructura de carpetas sigue `src/<feature>/dto/`

---

### 6.3 Validación con class-validator ⭐

**Concepto.** Los DTOs con `class-validator` son el contrato de entrada de cada endpoint. Cuando el `ValidationPipe` global tiene `whitelist: true`, cualquier campo no declarado en el DTO es eliminado silenciosamente antes de llegar al servicio — esto previene que datos inesperados lleguen a Prisma o contaminen la lógica de negocio. Sin `class-validator`, los datos sucios atraviesan todo el stack.

Los mensajes de validación en español son obligatorios en este proyecto (Regla Innegociable #4). Solo se decoran los campos en `CreateDto` — `ReplaceDto` y `UpdateDto` heredan los decoradores automáticamente via `extends` y `PartialType`. Decorar los DTOs derivados es duplicación que crea inconsistencias cuando cambia el base.

**Patrón base.**

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
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `ValidationPipe` debe registrarse con `whitelist: true` en `main.ts` | Sin `whitelist: true`, campos no declarados en el DTO llegan al servicio — Prisma puede rechazarlos o, peor, aceptarlos silenciosamente. |
| 2 | `@IsOptional()` debe ir ANTES de los demás validators | Si está después, el validator siguiente corre aunque el campo sea `undefined`, generando falsos positivos de validación. |
| 3 | Solo decorar `CreateDto` — los derivados heredan automáticamente | Duplicar decoradores en `UpdateDto` y `ReplaceDto` crea inconsistencias cuando se cambia un campo en el base. |
| 4 | `@IsOptional()` no desactiva los demás validators — si el campo viene, se sigue validando | Un campo opcional con valor inválido sigue fallando la validación, lo cual es el comportamiento correcto. |

**Anti-patrones.**

- ❌ Validar manualmente en el servicio con `if (!data.name)` en lugar de usar `class-validator`
- ❌ Mensajes de validación en inglés
- ❌ Decorar los campos en `UpdateDto` en lugar de solo en `CreateDto`
- ❌ Registrar `ValidationPipe` sin `whitelist: true`

**Prompt reutilizable.**

```
Crea los DTOs para [entidad] en src/[entidad]/dto/:
- create-[entidad].dto.ts: campos [lista] con class-validator, mensajes en español
- update-[entidad].dto.ts: PartialType(Create[Entidad]Dto) — sin campos propios
- replace-[entidad].dto.ts: extends Create[Entidad]Dto directamente

Solo decorar el Create DTO — los demás heredan.
Conecta los DTOs al controlador con @Body().
```

**Code review específico.**

- [ ] `ValidationPipe` registrado en `main.ts` con `whitelist: true`
- [ ] Todos los mensajes de validación están en español
- [ ] `UpdateDto` usa `PartialType(CreateDto)` y no declara campos propios
- [ ] `ReplaceDto` extends `CreateDto` directamente, sin `PartialType`
- [ ] `@IsOptional()` está antes de los demás decoradores en campos opcionales

---

### 6.4 Prisma 7: integración base ⭐

**Concepto.** Prisma es el ORM que usa este proyecto para hablar con PostgreSQL. La versión 7 introdujo cambios importantes respecto a versiones anteriores: el cliente se genera localmente (no se importa de `@prisma/client`), la URL de conexión se separó del schema, y el `PrismaClient` requiere un adapter explícito en el constructor. Estos cambios rompen tutoriales viejos de internet — por eso este capítulo existe.

**Patrón base — Instalación.**

```bash
npm install @prisma/client @prisma/adapter-pg
npm install -D prisma
npx prisma init
```

**Patrón base — `schema.prisma`.**

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "commonjs"   // ⚠️ obligatorio para NestJS
}

datasource db {
  provider = "postgresql"
  // ⚠️ NO va url aquí — va en prisma.config.ts
}
```

**Patrón base — `prisma.config.ts`.**

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

**Patrón base — `PrismaService`.**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

**Patrón base — `PrismaModule` global.**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**Variantes / casos comunes.**

- **Migración inicial:** `npx prisma migrate dev --name init && npx prisma generate`
- **Después de cada cambio en schema:** correr ambos comandos otra vez
- **Inspeccionar la DB visualmente:** `npx prisma studio`

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `moduleFormat = "commonjs"` es obligatorio | Sin esto Prisma genera ESM y NestJS no puede importarlo. La app compila pero **falla en runtime** con error críptico. |
| 2 | `url` NO va en `schema.prisma` — va en `prisma.config.ts` | Prisma 7 separó la config. Tutoriales viejos te llevan al error "datasource provider not found". |
| 3 | Siempre correr `prisma generate` después de `prisma migrate` | Sin esto, los tipos de TypeScript no reflejan el schema nuevo y el código nuevo no compila. |
| 4 | Import desde `'../../generated/prisma/client'`, no desde `@prisma/client` | `@prisma/client` no contiene los tipos de TUS modelos. Es un error silencioso: el código compila pero no tiene autocomplete. |
| 5 | `PrismaClient` requiere `adapter` en el constructor | Sin el adapter, el cliente no sabe cómo conectarse. Error en runtime al primer query. |

**Anti-patrones.**

- ❌ Importar `PrismaClient` de `@prisma/client` (es la versión vieja, no la generada localmente)
- ❌ Olvidar `@Global()` en `PrismaModule` y luego importar `PrismaModule` en cada feature module
- ❌ Hardcodear `DATABASE_URL` en el código en lugar de leerla del `.env`
- ❌ Usar `prisma migrate dev` en producción (es solo para desarrollo)

**Prompt reutilizable.**

```
Integra Prisma 7 con PostgreSQL en este proyecto NestJS:
1. Instala @prisma/client, @prisma/adapter-pg y prisma (dev)
2. Inicializa Prisma con npx prisma init
3. Configura schema.prisma con moduleFormat="commonjs" y output="../generated/prisma"
4. Configura prisma.config.ts con datasource.url leyendo de process.env.DATABASE_URL
5. Crea PrismaService extendiendo PrismaClient con PrismaPg adapter
6. Crea PrismaModule con @Global() exportando PrismaService
7. Agrega DATABASE_URL a .env y .env.example
8. Registra PrismaModule en AppModule
```

**Code review específico.**

- [ ] `moduleFormat = "commonjs"` está presente en `schema.prisma`
- [ ] `url` NO aparece en `schema.prisma` (solo en `prisma.config.ts`)
- [ ] `PrismaService` extiende `PrismaClient` con adapter
- [ ] `PrismaModule` tiene `@Global()` y exporta `PrismaService`
- [ ] Imports de Prisma vienen de `generated/prisma/client`, no de `@prisma/client`

---

### 6.5 Prisma 7: relaciones ⭐

**Concepto.** En bases de datos relacionales, la llave foránea (FK) siempre vive en el lado "muchos" de la relación. En Prisma, además de la columna FK, se declaran campos de relación virtuales en ambos modelos — estos no generan columnas en la DB pero permiten usar `include` para obtener datos relacionados. Una confusión frecuente es pensar que `Product[]` en Category crea una columna real en la tabla Category: no lo hace, es solo una directiva para el cliente Prisma.

Cuando se agrega una FK obligatoria a un modelo con registros existentes, la migración falla porque PostgreSQL no puede rellenar el valor de la nueva columna `NOT NULL` para las filas históricas. La solución de desarrollo es marcar el campo como opcional (`Int?`) temporalmente, migrar, y quitar el `?`.

**Patrón base.**

```prisma
model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[] // virtual — no crea columna en DB
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

```bash
npx prisma migrate dev --name add-categories
npx prisma generate
```

**Variantes / casos comunes.**

Flujo de creación con relación:

```json
// 1. Primero crear la entidad padre
POST /categories
{ "name": "Electrónica" }

// 2. Luego crear el hijo con la FK
POST /products
{
  "name": "Laptop",
  "description": "Laptop gamer 16GB RAM",
  "price": 1200,
  "stock": 10,
  "categoryId": 1
}
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `products Product[]` en Category es virtual — no genera columna en la DB | Confundir esto lleva a buscar un campo `products` en la tabla real, que no existe. Los datos solo aparecen al usar `include`. |
| 2 | Si hay datos existentes y la FK es NOT NULL sin default, la migración falla | Sin una salida para las filas históricas, PostgreSQL rechaza el ALTER TABLE. Usar `Int?` temporalmente o limpiar la DB de desarrollo. |
| 3 | El `autoincrement` no se resetea al borrar registros | Es comportamiento esperado de PostgreSQL sequences — no confundir con un bug cuando los IDs no son consecutivos. |
| 4 | Sin `categoryId` en el body, el validador rechaza con 400 | Hay que agregar la FK al DTO con `@IsInt()` y `@IsPositive()`. |

**Anti-patrones.**

- ❌ Olvidar `npx prisma generate` después de agregar relaciones al schema
- ❌ Migrar con `migrate dev` cuando hay datos existentes y la nueva columna es NOT NULL sin default
- ❌ Intentar filtrar por la relación virtual directamente sin `include`

**Prompt reutilizable.**

```
Agrega una relación One-to-Many entre [ModeloPadre] y [ModeloHijo] en prisma/schema.prisma:
- [ModeloPadre]: agregar campo [hijos] [ModeloHijo][] (virtual, no genera columna)
- [ModeloHijo]: agregar campo [padreId] Int y [padre] [ModeloPadre] @relation(fields: [[padreId]], references: [id])
Crear migración con nombre 'add-[relacion]' y regenerar el cliente.
Actualizar el DTO de [ModeloHijo] para incluir [padreId] como campo obligatorio.
```

**Code review específico.**

- [ ] El campo inverso en el padre (`Product[]`) no tiene `@unique` — es One-to-Many correctamente
- [ ] La FK en el hijo (`categoryId`) está declarada en el DTO como requerida
- [ ] `npx prisma generate` fue ejecutado después de la migración
- [ ] Si había datos existentes, la FK se agregó como opcional (`?`) primero

---

### 6.6 Prisma 7: queries con include ⭐

**Concepto.** Por defecto, Prisma solo devuelve los campos escalares del modelo consultado — relaciones no se incluyen. Para obtener datos relacionados, se necesita `include`. Sin `include`, una query de productos devuelve `categoryId: 2` (el número de la FK) pero no el objeto `category` completo. `include` instruye a Prisma a hacer el JOIN y anidar el resultado.

`include` y `select` son mutuamente excluyentes al mismo nivel de query — no se pueden usar juntos en la raíz. Si se necesita solo un subconjunto de campos de la relación, se usa `select` *dentro* del `include`. Agregar `include` en métodos de escritura (`create`, `update`) por defecto infla las respuestas sin necesidad — solo se justifica cuando el cliente lo requiere explícitamente.

**Patrón base.**

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

Respuesta resultante:

```json
// Sin include:
{ "id": 1, "name": "Laptop", "categoryId": 2, "price": 1200, "stock": 10 }

// Con include: { category: true }:
{
  "id": 1, "name": "Laptop", "categoryId": 2, "price": 1200, "stock": 10,
  "category": { "id": 2, "name": "Electrónica" }
}
```

**Variantes / casos comunes.**

```typescript
// Include anidado (2+ niveles)
this.prisma.category.findMany({
  include: {
    products: {
      include: { supplier: true },
    },
  },
})

// select dentro de include (proyección de campos)
this.prisma.product.findMany({
  include: {
    category: {
      select: { name: true }, // solo el nombre, sin el id
    },
  },
})
```

`include` en métodos de lectura del servicio:

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

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `include` y `select` son mutuamente excluyentes al mismo nivel | Si se usan juntos en la raíz, TypeScript puede no detectarlo pero Prisma lanza error en runtime. |
| 2 | `include: { category: true }` falla en compilación si el campo no está en el schema como relación | Significa que faltó `npx prisma generate` después de agregar la relación. |
| 3 | Incluir relaciones inversas grandes sin acotar impacta rendimiento | Una categoría con 10.000 productos incluidos en cada query es una consulta enorme. Usar `take`/`skip` o `select` para acotar. |
| 4 | El tipo de retorno cambia automáticamente al añadir `include` | TypeScript infiere el tipo extendido — no es necesario declarar tipos de retorno manuales. |

**Anti-patrones.**

- ❌ Agregar `include` en métodos de escritura por defecto sin justificación
- ❌ Mezclar `include` y `select` al mismo nivel de la query raíz
- ❌ Incluir relaciones inversas sin paginar cuando la relación puede tener muchos registros

**Prompt reutilizable.**

```
En src/[entidad]/[entidad].service.ts agrega include: { [relacion]: true }
a los métodos findAll y findOne para que retornen el objeto
completo de [relacion] en cada [entidad].
```

**Code review específico.**

- [ ] `include` solo está en métodos de lectura (`findAll`, `findOne`) salvo justificación explícita
- [ ] `include` y `select` no se mezclan al mismo nivel
- [ ] Relaciones inversas con muchos registros tienen `take`/`skip` o proyección con `select`

---

### 6.7 Prisma 7: validación de FK ⭐

**Concepto.** Cuando se intenta crear un registro con una FK que no existe en la tabla padre, Prisma lanza un error de constraint de base de datos (código `P2003`). Sin manejo explícito, este error llega al cliente como un `500 Internal Server Error` con un mensaje técnico incomprensible. La solución es interceptarlo antes de la query de Prisma: verificar que la entidad referenciada exista y lanzar un `404` con un mensaje claro si no.

Esta validación se extrae en un método privado del servicio para evitar duplicarla. En `patch` (PATCH), la validación es condicional: solo se ejecuta si el campo FK viene en el body, porque PATCH puede omitir cualquier campo.

**Patrón base.**

```typescript
private async validateCategoryExists(categoryId: number) {
  const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new NotFoundException(`Categoría con id ${categoryId} no encontrada`);
}
```

```typescript
async create(data: CreateProductDto) {
  await this.validateCategoryExists(data.categoryId);       // siempre requerido en POST
  return this.prisma.product.create({ data });
}

async replace(id: number, data: ReplaceProductDto) {
  await this.findOne(id);
  await this.validateCategoryExists(data.categoryId);       // siempre requerido en PUT
  return this.prisma.product.update({ where: { id }, data });
}

async patch(id: number, data: UpdateProductDto) {
  await this.findOne(id);
  if (data.categoryId !== undefined)                        // condicional en PATCH
    await this.validateCategoryExists(data.categoryId);
  return this.prisma.product.update({ where: { id }, data });
}
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | Sin este helper, Prisma lanza `P2003` como `500` con mensaje técnico | El cliente recibe un error interno inútil y no puede corregir su request. Viola la Regla Innegociable #6. |
| 2 | Usar `findUnique` (no `findFirst`) porque `id` es PK | `findUnique` es más eficiente ya que PostgreSQL puede usar el índice primario directamente. |
| 3 | En `patch`, la validación es condicional con `if (data.categoryId !== undefined)` | Si se valida siempre, un PATCH sin `categoryId` en el body fallaría innecesariamente con 404. |

**Anti-patrones.**

- ❌ Dejar que Prisma lance `P2003` y propagarlo como `500` al cliente
- ❌ Duplicar la validación inline en `create`, `replace` y `patch` en lugar de extraer un helper privado
- ❌ Validar `categoryId` en `patch` sin verificar si viene en el body

**Prompt reutilizable.**

```
En src/[entidad]/[entidad].service.ts, en los métodos create, replace y patch,
valida que [fk_field] exista usando this.prisma.[relacion].findUnique({ where: { id: data.[fk_field] } }).
Si no existe, lanza NotFoundException con mensaje "[Entidad relacionada] con id ${data.[fk_field]} no encontrada".
En patch, solo valida si [fk_field] está presente en el body (if (data.[fk_field] !== undefined)).
```

**Code review específico.**

- [ ] FK validada ANTES de la query de Prisma en `create` y `replace`
- [ ] En `patch`, la validación de FK está dentro de `if (data.[fkField] !== undefined)`
- [ ] El mensaje del 404 identifica la entidad y el id (`"Categoría con id X no encontrada"`)
- [ ] Se usa `findUnique` (no `findFirst`) para la validación

---

### 6.8 Prisma 7: seeding ⭐

**Concepto.** El seed es un script que puebla la DB con datos iniciales reproducibles — útil para desarrollo, demos y pruebas. En Prisma 7, el seed se configura en `prisma.config.ts` bajo `migrations.seed` (no en `package.json` como en versiones anteriores). La herramienta de ejecución importa: `ts-node` falla porque el cliente generado usa imports `.js` que `ts-node` en modo CommonJS no puede resolver. `tsx` maneja ambos formatos sin configuración adicional.

Un seed bien diseñado es idempotente: ejecutarlo múltiples veces no produce errores ni datos duplicados. La estrategia `deleteMany + create` borra todo antes de insertar (simple pero destructiva). La estrategia `upsert` preserva registros existentes que no estén en el seed (ver capítulo 6.9).

**Patrón base.**

```typescript
// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Limpiar antes de insertar — orden: hijo → padre (FK constraints)
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

```typescript
// prisma.config.ts — agregar migrations.seed
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",   // tsx, no ts-node
},
```

```bash
npx prisma db seed
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `ts-node` falla con Prisma 7 — usar `tsx` | El cliente generado usa imports `.js` que `ts-node` en modo CommonJS no resuelve. El error `Cannot find module './internal/class.js'` es críptico. |
| 2 | El seed va en `prisma.config.ts → migrations.seed`, no en `package.json` | Prisma 7 ignora la config de seed en `package.json`. `npx prisma db seed` no encontrará el script. |
| 3 | `PrismaClient` requiere el adapter igual que en `PrismaService` | Sin el adapter, el seed no puede conectarse a la DB — mismo error que en `PrismaService`. |
| 4 | Import desde `'../generated/prisma/client'` con `/client` al final | Importar desde `'../generated/prisma'` falla silenciosamente sin el subfijo `/client`. |
| 5 | `deleteMany` en orden hijo → padre para respetar FK | Si se borran categorías antes que productos, PostgreSQL lanza FK constraint violation. |

**Anti-patrones.**

- ❌ Configurar el seed en `package.json` en lugar de `prisma.config.ts`
- ❌ Usar `ts-node` para ejecutar el seed
- ❌ Guardar contraseñas en texto plano en el seed (usar `bcrypt.hash`)
- ❌ `deleteMany` en orden padre → hijo (viola FK constraints)

**Prompt reutilizable.**

```
Crea un seed en prisma/seed.ts que pueble la DB con datos de prueba:
- [lista de entidades y datos]
Usa tsx (no ts-node). Configura el comando en prisma.config.ts → migrations.seed.
El seed debe ser idempotente: deleteMany en orden hijo → padre, luego insertar.
```

**Code review específico.**

- [ ] `prisma.config.ts` tiene `migrations.seed: "tsx prisma/seed.ts"` (no `ts-node`)
- [ ] `PrismaClient` se instancia con `PrismaPg` adapter
- [ ] Import desde `'../generated/prisma/client'` (con `/client`)
- [ ] `deleteMany` en orden hijo → padre antes de insertar
- [ ] Contraseñas hasheadas con `bcrypt` antes de insertar

---

### 6.9 Prisma 7: upsert ⭐

**Concepto.** `upsert` combina `create` + `update` en una operación atómica: si el registro no existe lo crea; si ya existe lo actualiza. Es la alternativa a `deleteMany + create` para seeds que deben preservar datos de producción existentes. La diferencia clave: `deleteMany + create` borra todo y reinserta; `upsert` solo toca los registros que están en la lista, dejando el resto intacto.

El campo usado como clave en `where` debe tener `@unique` en el schema — Prisma necesita garantía de que la búsqueda retorna exactamente cero o un registro. Prisma valida esto en tiempo de compilación.

**Patrón base.**

```typescript
await prisma.user.upsert({
  where:  { email: 'admin@ecommerce.com' },   // campo con @unique
  create: { email: 'admin@ecommerce.com', password: hashed, role: 'ADMIN' },
  update: { password: hashed, role: 'ADMIN' }, // solo los campos que se deben actualizar
});
```

**Variantes / casos comunes.**

Uso en seed de usuarios del proyecto:

```typescript
const hashed = await bcrypt.hash('Admin123!', 10);

await prisma.user.upsert({
  where:  { email: 'admin@ecommerce.com' },
  update: { password: hashed, role: 'ADMIN', isActive: true },
  create: { email: 'admin@ecommerce.com', password: hashed, role: 'ADMIN', isActive: true },
});
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | El campo en `where` debe tener `@unique` en el schema | Prisma lo valida en tiempo de compilación — error TypeScript si el campo no es único. Si se ignora este error, hay riesgo de colisiones en runtime. |
| 2 | `update` no necesita todos los campos — solo los que se deben actualizar | Si se incluyen todos los campos en `update`, se sobrescriben datos que no se querían tocar (ej: `createdAt`). |
| 3 | `create` sí necesita todos los campos obligatorios del modelo | A diferencia de `update`, `create` debe satisfacer todas las constraints `NOT NULL`. |
| 4 | `upsert` no borra registros que no estén en la lista — `deleteMany + create` sí los borra | Si el objetivo es "solo estos registros deben existir", usar `deleteMany + create`. Si es "estos deben existir pero los demás también", usar `upsert`. |

**Anti-patrones.**

- ❌ Usar `deleteMany + create` cuando se necesita preservar datos existentes
- ❌ Usar un campo sin `@unique` como clave en el `where` del upsert
- ❌ Incluir en `update` campos que no deben modificarse (como `id`, `createdAt`)

**Prompt reutilizable.**

```
En prisma/seed.ts reemplaza los create de [modelo] por upsert para que
el seed sea idempotente. Usar [campo único] como clave en where.
En update, incluir solo los campos que deben actualizarse si el registro ya existe.
En create, incluir todos los campos obligatorios.
```

**Code review específico.**

- [ ] El campo en `where` tiene `@unique` en el schema de Prisma
- [ ] `update` solo incluye los campos que deben actualizarse
- [ ] `create` incluye todos los campos obligatorios del modelo
- [ ] Contraseñas hasheadas con `bcrypt` antes del upsert

---

### 6.10 Paginación ⭐

**Concepto.** `skip` descarta los primeros N registros; `take` limita cuántos se devuelven. Juntos implementan paginación offset estándar: `skip = (page - 1) * limit`. Las dos queries (`findMany` y `count`) se ejecutan en paralelo con `Promise.all` para no hacer una esperar a la otra — en una tabla grande, la diferencia de latencia es notable.

El `count` debe recibir el mismo objeto `where` que `findMany`. Si se olvida esto, `total` refleja el total de toda la tabla y `totalPages` queda incorrecto cuando hay filtros activos — el cliente no puede navegar correctamente.

**Patrón base.**

```typescript
// Servicio
async findAll(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    this.prisma.product.findMany({ where, skip, take: limit, include: { category: true } }),
    this.prisma.product.count({ where }),   // mismo where para totales correctos
  ]);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

```typescript
// Controller
@Get()
async findAll(
  @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
) {
  return this.productsService.findAll(page, limit);
}
```

Response shape:

```json
{ "data": [...], "total": 25, "page": 2, "limit": 10, "totalPages": 3 }
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `count` debe recibir el mismo `where` que `findMany` | Sin esto, `total` y `totalPages` son incorrectos cuando hay filtros activos — el cliente no puede navegar. |
| 2 | Los defaults (`page=1`, `limit=10`) van en el servicio, no en el controller | El controller pasa los valores directamente — si no vienen, el servicio maneja los defaults con sus valores por defecto en la firma. |
| 3 | `ParseIntPipe` sin `{ optional: true }` lanza 400 si el param no viene | Sin `optional: true`, una request sin `?page=` falla con un error de validación inesperado. |

**Anti-patrones.**

- ❌ Pasar `count` sin el mismo `where` que `findMany`
- ❌ No usar `Promise.all` — ejecutar `findMany` y `count` secuencialmente es innecesariamente lento
- ❌ Poner los defaults de `page` y `limit` en el controller

**Prompt reutilizable.**

```
En src/[entidad]/[entidad].service.ts modifica findAll para aceptar page y limit
como parámetros opcionales (default: page=1, limit=10).
Usar skip: (page-1)*limit y take: limit en findMany.
Ejecutar findMany y count en paralelo con Promise.all. El count recibe el mismo where.
Retornar { data, total, page, limit, totalPages: Math.ceil(total / limit) }.

En el controller agrega @Query('page') y @Query('limit') con ParseIntPipe({ optional: true }).
```

**Code review específico.**

- [ ] `count` recibe el mismo `where` que `findMany`
- [ ] `findMany` y `count` se ejecutan en paralelo con `Promise.all`
- [ ] Los defaults están en el servicio (`page = 1, limit = 10` en la firma del método)
- [ ] `ParseIntPipe({ optional: true })` en los query params del controller
- [ ] Response incluye `{ data, total, page, limit, totalPages }`

---

### 6.11 Filtros dinámicos ⭐

**Concepto.** Construir el objeto `where` de Prisma condicionalmente con spread operator — solo se incluyen las propiedades cuyos valores están definidos. Así una query sin filtros devuelve todo, y cada filtro que llega se aplica de forma aditiva (AND implícito de Prisma). La clave es distinguir "el filtro no vino" (`undefined`) de "el filtro vino con valor falsy" (`0`, `""`, `false`) — para esto se compara explícitamente con `!== undefined`, nunca con `if (value)`.

El mismo objeto `where` se pasa tanto a `findMany` como a `count`. Si se construyen dos objetos `where` separados, hay riesgo de que diverjan y los totales de paginación sean incorrectos.

**Patrón base.**

```typescript
const where = {
  // Filtro exacto por FK
  ...(categoryId !== undefined && { categoryId }),

  // Filtro de rango — solo incluir si al menos uno de los dos límites viene
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

```typescript
// Controller — tipo correcto para cada parámetro
@Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
@Query('minPrice',   new ParseFloatPipe({ optional: true })) minPrice?: number,
@Query('maxPrice',   new ParseFloatPipe({ optional: true })) maxPrice?: number,
@Query('search') search?: string,
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `mode: 'insensitive' as const` es necesario en búsquedas de texto | Sin el cast, TypeScript no acepta el literal `'insensitive'` como valor del tipo `QueryMode` de Prisma. Error de compilación. |
| 2 | El filtro de rango solo se agrega si viene al menos uno de los dos límites | Sin esta guarda, se agrega `price: {}` que es ruido — aunque Prisma lo ignora, contamina el objeto. |
| 3 | Todos los filtros son AND implícito — Prisma los combina automáticamente | No hay que encadenarlos manualmente con `AND: [...]`. |
| 4 | El mismo `where` debe pasarse a `findMany` y a `count` | Dos objetos `where` separados pueden diverjar y los totales de paginación quedan incorrectos. |

**Anti-patrones.**

- ❌ Usar `if (value)` para chequear filtros — colapsa valores `0`, `""` o `false` válidos
- ❌ Construir dos objetos `where` separados para `findMany` y `count`
- ❌ Usar `ParseIntPipe` para strings o `ParseFloatPipe` para enums

**Prompt reutilizable.**

```
En src/[entidad]/[entidad].service.ts modifica findAll para aceptar estos filtros opcionales:
- [campo FK]?: number → filtrar por FK exacta
- minPrice?: number / maxPrice?: number → rango de precio con gte/lte
- search?: string → contains insensitive en [campo1] y [campo2]

Construir el objeto where dinámicamente con spread condicional: solo incluir si !== undefined.
Pasar el mismo objeto where a findMany y a count.

En el controller agregar los @Query params con ParseIntPipe/ParseFloatPipe donde corresponda.
```

**Code review específico.**

- [ ] `mode: 'insensitive' as const` en búsquedas de texto
- [ ] El mismo objeto `where` se pasa a `findMany` y a `count`
- [ ] Filtro de rango solo se incluye cuando al menos uno de los límites está definido
- [ ] Enteros → `ParseIntPipe`, decimales → `ParseFloatPipe`, strings → sin pipe
- [ ] Comparaciones con `!== undefined`, no con `if (value)`

---

### 6.12 Autenticación JWT ⭐

**Concepto.** JWT (JSON Web Token) es un mecanismo stateless para autenticar usuarios. En lugar de que el servidor recuerde quién está logueado (sesiones), el cliente lleva un token firmado que el servidor puede verificar en cada request sin tocar la base de datos. El token contiene un *payload* con los datos del usuario y una *firma* hecha con un secreto que solo el servidor conoce — si alguien modifica el token, la firma deja de ser válida y el servidor lo rechaza.

En este proyecto, el flujo es: el usuario hace login con email+password, el servidor valida las credenciales con bcrypt, y emite un JWT firmado con `JWT_SECRET` que el cliente debe enviar en el header `Authorization: Bearer <token>` en todas las requests posteriores.

**Patrón base — Instalación.**

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

**Patrón base — Flujo completo.**

```
POST /auth/register
  → AuthService.register()
      → UsersService.findByEmail()    // verificar duplicado
      → bcrypt.hash(password, 10)     // nunca guardar password plano
      → UsersService.create()
      → retornar usuario sin password

POST /auth/login
  → AuthService.login()
      → UsersService.findByEmail()    // usuario existe?
      → bcrypt.compare()              // password válida?
      → user.isActive === true?       // cuenta habilitada?
      → jwtService.sign({ sub, email, role })
      → retornar { access_token }

GET /ruta-protegida (Authorization: Bearer <token>)
  → JwtAuthGuard.canActivate()
      → ¿isPublic? → sí → pasar
      → PassportStrategy.validate()   // verificar firma + extraer payload
      → req.user = { id, email, role }
  → RolesGuard.canActivate()
      → ¿requiredRoles? → no → pasar
      → req.user.role in requiredRoles? → sí → pasar / no → 403
```

**Patrón base — `JwtStrategy`.**

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

**Patrón base — `AuthModule` con `registerAsync`.**

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

**Variantes / casos comunes.**

- **Refrescar tokens:** endpoint `POST /auth/refresh` que recibe el token actual y emite uno nuevo con `expiresIn` extendido
- **Logout:** como JWT es stateless, el "logout" real requiere una blacklist en Redis o cambiar el secreto. En la mayoría de casos, basta con que el cliente borre el token de su almacenamiento.
- **Tokens de corta duración:** cambiar `expiresIn: '7d'` por `'15m'` y usar refresh tokens

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `secretOrKey: configService.get<string>('JWT_SECRET') as string` requiere el cast | `get()` puede retornar `undefined` y el tipo de passport-jwt rechaza `undefined`. Sin el cast, no compila. |
| 2 | `JwtStrategy` debe ser provider en `AuthModule`, no en `AppModule` | Si está en `AppModule`, no tiene acceso a las dependencias de `AuthModule` y falla la DI. |
| 3 | `UsersModule` debe **exportar** `UsersService` para que `AuthModule` pueda inyectarlo | Sin el `exports`, NestJS lanza un error de DI cryptic en arranque. |
| 4 | Nunca retornar `password` en respuestas — usar destructuring: `const { password: _, ...result } = user` | Un solo leak de password compromete cuentas. Esto es **regla innegociable #5**. |
| 5 | `bcrypt.hash(password, 10)` — el segundo argumento son los salt rounds | Menos de 10 es inseguro hoy en día; más de 12 es muy lento. 10 es el equilibrio estándar. |
| 6 | `JwtModule.register({ secret: '...' })` hardcodea el secreto | Hay que usar `registerAsync` con `ConfigService` para leer del `.env`. Hardcodear secretos = riesgo de seguridad. |
| 7 | El header se llama `Authorization`, no `Auth` ni `Token` | Es estándar HTTP. Confundirse acá es la causa #1 de "mi token no funciona". |
| 8 | El valor del header es `Bearer <token>`, con el prefijo "Bearer " incluido | Sin "Bearer ", `ExtractJwt.fromAuthHeaderAsBearerToken()` devuelve `null` y el guard rechaza el request. |

**Anti-patrones.**

- ❌ Guardar contraseñas en texto plano en la base de datos
- ❌ Usar el mismo `JWT_SECRET` en desarrollo y producción
- ❌ Devolver el `password` (incluso hasheado) en cualquier respuesta
- ❌ Hardcodear `JWT_SECRET` en el código
- ❌ Confiar en `req.body.userId` en endpoints autenticados — siempre usar `req.user.id`
- ❌ Tokens con expiración infinita (`expiresIn` ausente)

**Prompt reutilizable.**

```
Implementa autenticación JWT en este proyecto NestJS:
- UsersModule con UsersService (findByEmail, findById, create) — sin controller propio
- AuthModule con AuthService:
  - register: hashea con bcrypt salt 10, valida email duplicado, retorna user sin password
  - login: valida credenciales, verifica isActive, genera JWT con payload { sub, email, role }, expiresIn 7d
- JwtStrategy que extrae Bearer token, verifica con JWT_SECRET, retorna { id, email, role } en req.user
- JwtAuthGuard que omite validación en rutas marcadas con @Public()
- Registra JwtAuthGuard como APP_GUARD global en AppModule
- Agrega JWT_SECRET a la validación Joi y al .env.example
- Asegúrate de que UsersModule exporte UsersService
- Ningún endpoint debe retornar el campo password en la respuesta
```

**Code review específico.**

- [ ] `password` no aparece en ninguna respuesta (buscar el string en el código)
- [ ] `bcrypt.hash` usa salt rounds = 10
- [ ] `JwtModule.registerAsync` lee `JWT_SECRET` desde `ConfigService`, no hardcodeado
- [ ] `JwtStrategy` está en providers de `AuthModule`
- [ ] `UsersModule` exporta `UsersService`
- [ ] `JwtAuthGuard` está registrado como `APP_GUARD` en `AppModule`
- [ ] Las rutas de `/auth/register` y `/auth/login` tienen `@Public()`
- [ ] El payload del JWT incluye `sub`, `email`, `role` (no incluye datos sensibles)
- [ ] `expiresIn` está configurado (no es token eterno)

---

### 6.13 Guards y Roles ⭐

**Concepto.** NestJS separa autenticación y autorización en dos guards distintos que corren en orden. `JwtAuthGuard` (autenticación) verifica que el token JWT sea válido y carga el usuario en `req.user`. `RolesGuard` (autorización) lee la metadata de `@Roles()` y verifica que `req.user.role` esté en la lista de roles permitidos. El orden es crítico: si `RolesGuard` corre primero, `req.user` aún no existe y `RolesGuard` falla con un error no manejado.

El decorador `@Public()` le dice a `JwtAuthGuard` que omita la validación de token para esa ruta. Sin él, todos los endpoints requieren token porque los guards están registrados globalmente. Las rutas de autenticación (`/auth/register`, `/auth/login`) siempre necesitan `@Public()` explícito o quedan inaccesibles.

**Patrón base.**

```typescript
// src/common/decorators/public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/common/decorators/roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

```typescript
// src/auth/jwt-auth.guard.ts
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

```typescript
// src/common/guards/roles.guard.ts
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

```typescript
// AppModule — orden obligatorio
providers: [
  AppService,
  { provide: APP_GUARD, useClass: JwtAuthGuard },  // 1º — autentica
  { provide: APP_GUARD, useClass: RolesGuard },     // 2º — autoriza
],
```

**Variantes / casos comunes.**

Uso en controllers:

```typescript
@Public()           // sin token requerido
@Get()
findAll() { ... }

@Roles('ADMIN')     // requiere token válido con role === 'ADMIN'
@Post()
create() { ... }
```

Tabla de permisos por rol:

| Acción | Sin token | USER | ADMIN |
|--------|-----------|------|-------|
| Leer productos/categorías | ✅ | ✅ | ✅ |
| Crear/editar/eliminar productos | ❌ 401 | ❌ 403 | ✅ |
| Registrarse / login | ✅ | ✅ | ✅ |

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `getAllAndOverride` busca en el handler primero, luego en la clase | El decorador más específico gana — `@Public()` en un método sobreescribe `@Roles()` a nivel de clase. |
| 2 | Sin `@Public()`, TODOS los endpoints requieren token válido (guard global) | Las rutas de auth quedarán bloqueadas con 401. No hay ningún error de compilación que avise. |
| 3 | `RolesGuard` confía en `req.user` que pone `JwtAuthGuard` — si el orden se invierte, `user` es `undefined` | `RolesGuard` lanzará un error no manejado o 403 incorrecto en lugar de 401. |
| 4 | Rutas de auth necesitan `@Public()` explícitamente | Sin él, `/auth/register` y `/auth/login` exigen token, bloqueando el acceso inicial. |

**Anti-patrones.**

- ❌ Registrar `RolesGuard` antes de `JwtAuthGuard` en `AppModule`
- ❌ Usar `@Roles()` en rutas que deberían ser públicas en lugar de `@Public()`
- ❌ Hardcodear lógica de autorización en el servicio en lugar de usar los guards
- ❌ Olvidar `@Public()` en `/auth/register` y `/auth/login`

**Prompt reutilizable.**

```
Agrega protección de endpoints con JwtAuthGuard y RolesGuard:
1. Decorador @Public() en src/common/decorators/public.decorator.ts
2. Decorador @Roles() en src/common/decorators/roles.decorator.ts
3. RolesGuard en src/common/guards/roles.guard.ts — lanza ForbiddenException 403 con mensaje en español
4. Modifica JwtAuthGuard para omitir validación en rutas @Public()
5. Registra ambos guards como APP_GUARD en AppModule (JwtAuthGuard primero)
6. En [Controller]: lectura pública → @Public(), escritura → @Roles('ADMIN')
```

**Code review específico.**

- [ ] `JwtAuthGuard` registrado ANTES de `RolesGuard` en `AppModule`
- [ ] Rutas de `/auth` tienen `@Public()`
- [ ] Endpoints de escritura tienen `@Roles('ADMIN')` o justificación explícita
- [ ] `RolesGuard` lanza `ForbiddenException` con mensaje en español
- [ ] `IS_PUBLIC_KEY` y `ROLES_KEY` son constantes exportadas, no strings inline

---

### 6.14 Manejo de errores ⭐

**Concepto.** NestJS devuelve errores en un formato propio. Para estandarizarlo y agregar campos útiles como `timestamp` y `path`, se implementa un `HttpExceptionFilter` global. El problema principal que resuelve es el de los errores de validación: por defecto, múltiples errores de `class-validator` se concatenan en un solo string — inútil para una UI que necesita mostrar cada error en su campo correspondiente. El filtro los desempaca en un array.

El endpoint `DELETE` tiene una particularidad en NestJS: si el método usa `return`, NestJS serializa el resultado como body. Sin `return` (solo `await`), el body queda vacío y se envía el código 204 limpio. En Postman, el número `1` que aparece en el panel de body vacío NO es un body real — es el indicador de línea del panel vacío.

**Patrón base — `HttpExceptionFilter`.**

```typescript
// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? exceptionResponse['message']
        : exception.message;

    const isValidationError = Array.isArray(message);

    response.status(status).json({
      statusCode: status,
      message: isValidationError ? 'Error de validación' : message,
      ...(isValidationError && { errors: message }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

```typescript
// main.ts
app.useGlobalFilters(new HttpExceptionFilter());
```

**Patrón base — DELETE 204 sin body.**

```typescript
@Delete(':id')
@HttpCode(204)
async remove(@Param('id', ParseIntPipe) id: number) {
  await this.productsService.remove(id);  // sin return
}
```

**Variantes / casos comunes.**

Respuestas del filtro:

```json
// Error simple (404):
{ "statusCode": 404, "message": "Producto con id 6 no encontrado", "timestamp": "...", "path": "..." }

// Errores de validación (400):
{ "statusCode": 400, "message": "Error de validación", "errors": ["El nombre es obligatorio"], "timestamp": "...", "path": "..." }
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | Sin el filtro, los errores de validación llegan como string concatenado | El cliente recibe `"name must be a string, price must be greater than 0"` — inútil para mostrar en campos de un formulario. |
| 2 | `DELETE` con `return` devuelve body con el resultado del servicio | NestJS serializa cualquier valor retornado. Sin `return`, el body está vacío y el 204 es correcto. |
| 3 | El filtro debe registrarse en `main.ts` con `app.useGlobalFilters()` ANTES de `app.listen()` | Si se registra después, no captura errores del bootstrap. |
| 4 | Postman muestra `1` en el body de un DELETE 204 | Es el indicador de línea del panel vacío de Postman. No es un body real — el comportamiento es correcto. |

**Anti-patrones.**

- ❌ Mensajes de error en inglés
- ❌ Usar `return` en endpoints `DELETE`
- ❌ Manejar errores individualmente en cada controller en lugar de usar el filtro global
- ❌ Propagar errores de Prisma (`P2003`, `P2002`) directamente como 500

**Prompt reutilizable.**

```
Crea un filtro global de excepciones en src/common/filters/http-exception.filter.ts que:
- Retorne { statusCode, message, timestamp, path }
- Cuando haya múltiples errores de validación: message = "Error de validación" + errors: string[]
- Registra el filtro en main.ts con app.useGlobalFilters() antes de app.listen()
```

**Code review específico.**

- [ ] `HttpExceptionFilter` registrado en `main.ts` antes de `app.listen()`
- [ ] Response de errores incluye `statusCode`, `message`, `timestamp`, `path`
- [ ] Errores de validación tienen array `errors` y `message: "Error de validación"`
- [ ] Endpoints `DELETE` usan `await` sin `return` y tienen `@HttpCode(204)`
- [ ] Mensajes de error están en español

---

### 6.15 Swagger ⭐

**Concepto.** Swagger/OpenAPI genera documentación interactiva automáticamente a partir del código. En NestJS se configura en `main.ts` y se complementa con decoradores en controllers y DTOs. Sin `@ApiProperty`, Swagger muestra los schemas de los DTOs vacíos — el equipo de frontend no sabe qué campos enviar.

Solo se necesita decorar el DTO base (`CreateDto`). Los DTOs derivados (`ReplaceDto`, `UpdateDto`) heredan los decoradores `@ApiProperty` automáticamente via `extends` y `PartialType` — decorarlos manualmente crea duplicación que se desincroniza cuando cambia el base.

**Patrón base.**

```bash
npm install @nestjs/swagger
```

```typescript
// main.ts — antes de app.listen()
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Ecommerce API')
  .setDescription('API para gestión de productos y categorías')
  .setVersion('1.0')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

```typescript
// Controller
import { ApiTags } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductsController {}
```

```typescript
// DTO base — solo aquí se decoran los campos
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

La UI queda disponible en `http://localhost:3000/api`.

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | `@ApiProperty` solo va en el DTO base | `PartialType` y `extends` propagan los decoradores. Decorar en los DTOs derivados crea duplicación que se desincroniza. |
| 2 | Sin `@ApiProperty`, Swagger muestra el schema vacío para ese campo | El equipo de frontend no sabe qué enviar — el contrato de la API es invisible en la UI. |
| 3 | `SwaggerModule.setup` debe ir antes de `app.listen()` | Si se invierte el orden, la UI de Swagger no se registra y el endpoint `/api` devuelve 404. |
| 4 | La ruta `'api'` en `setup` produce `/api` — no agregar `/` al inicio | Con `/api` como primer argumento, la UI queda en `//api` (path doble barra). |

**Anti-patrones.**

- ❌ Decorar campos con `@ApiProperty` en `UpdateDto` o `ReplaceDto`
- ❌ Olvidar `SwaggerModule.setup` antes de `app.listen()`
- ❌ No agregar `@ApiTags` en los controllers (todos los endpoints quedan sin categoría en la UI)

**Prompt reutilizable.**

```
Integra Swagger en este proyecto NestJS:
1. Instalar @nestjs/swagger
2. En main.ts configurar SwaggerModule con title, description y version. Ruta: /api (antes de app.listen())
3. Agregar @ApiTags('[tag]') en los controllers
4. Agregar @ApiProperty({ description, example }) a todos los campos del DTO base de [entidad]
```

**Code review específico.**

- [ ] `SwaggerModule.setup('api', app, document)` está ANTES de `app.listen()`
- [ ] Cada controller tiene `@ApiTags('nombre-del-modulo')`
- [ ] Todos los campos del DTO base tienen `@ApiProperty` con `description` y `example`
- [ ] `UpdateDto` y `ReplaceDto` NO tienen `@ApiProperty` (los heredan del base)

---

### 6.16 Variables de entorno con Joi ⭐

**Concepto.** Validar variables de entorno al inicio de la aplicación evita errores crípticos en runtime. Sin validación, una app puede arrancar aparentemente bien con `DATABASE_URL` ausente y fallar solo cuando intenta la primera query — con un error de conexión difícil de trazar. Con Joi, la app falla inmediatamente al arrancar con un mensaje claro: `Config validation error: "DATABASE_URL" is required`.

La validación se integra en el `ConfigModule` de NestJS via el parámetro `validationSchema`. Joi corre antes de que cualquier módulo se inicialice — garantiza que si la app arranca, las variables críticas están presentes y tienen el tipo correcto.

**Patrón base.**

```bash
npm install joi
```

```typescript
// src/config/env.validation.ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
});
```

```typescript
// src/app.module.ts
import { envValidationSchema } from './config/env.validation';

ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: envValidationSchema,
}),
```

Error si falta una variable obligatoria:

```
Error: Config validation error: "DATABASE_URL" is required
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | Importar Joi con `import * as Joi from 'joi'` — no `import Joi from 'joi'` | Joi no tiene default export. Con el import incorrecto, `Joi` es `undefined` en runtime y el schema no se crea. |
| 2 | El schema solo valida las variables declaradas — las extra se ignoran | Si se agrega una variable nueva al `.env` sin declararla en el schema, pasa sin validación. Mantener sincronizados `.env.example` y el schema. |
| 3 | `Joi.number().default(3000)` aplica el default solo si la variable está ausente; si viene vacía (`PORT=`), Joi la rechaza | Variables con `=` pero sin valor no reciben el default — hay que eliminarlas del `.env`. |
| 4 | La validación ocurre antes de que cualquier módulo se inicialice | El error de Joi es lo primero que aparece al arrancar — no confundir con errores de conexión a DB. |

**Anti-patrones.**

- ❌ Usar `import Joi from 'joi'` (no tiene default export)
- ❌ No agregar al schema las variables nuevas cuando se añaden al `.env.example`
- ❌ Confiar en que la app falle "eventualmente" si falta una variable — validar siempre al inicio

**Prompt reutilizable.**

```
Agrega validación de variables de entorno con Joi:
1. Instalar joi
2. Crear src/config/env.validation.ts con schema Joi:
   - PORT: número, opcional, default 3000
   - DATABASE_URL: string, obligatorio
   - JWT_SECRET: string, obligatorio
   - [otras vars según el proyecto]
3. En app.module.ts pasar validationSchema: envValidationSchema al ConfigModule.forRoot()
```

**Code review específico.**

- [ ] Joi importado con `import * as Joi from 'joi'`
- [ ] Todas las variables obligatorias tienen `.required()`
- [ ] Variables opcionales con valor por defecto tienen `.default()`
- [ ] `validationSchema` está en el `ConfigModule.forRoot()` de `AppModule`
- [ ] `.env.example` tiene todas las variables declaradas en el schema

---

### 6.17 Módulo de Perfil (One-to-One) ⭐

**Concepto.** Una relación One-to-One en Prisma se declara igual que One-to-Many, con una diferencia clave: la FK tiene `@unique`. Este constraint garantiza que solo puede existir un Profile por User. Sin `@unique`, la relación sería One-to-Many y el campo inverso en User sería `Profile[]` (array) en lugar de `Profile?` (singular opcional).

El módulo de perfil tiene lógica de acceso distinta a otros módulos: cualquier usuario autenticado (cualquier rol) puede gestionar su propio perfil, pero nunca el de otro. El `userId` siempre viene de `req.user.id` — del JWT — nunca del body. Aceptarlo en el body permitiría que un usuario modifique el perfil de otro.

**Patrón base — Schema One-to-One.**

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
  userId    Int     @unique      // @unique → convierte FK en One-to-One
  user      User    @relation(fields: [userId], references: [id])
}
```

**Patrón base — Servicio.**

```typescript
async findByUserId(userId: number) {
  return this.prisma.profile.findUnique({ where: { userId } }); // retorna null si no existe
}

async create(userId: number, data: CreateProfileDto) {
  const existing = await this.prisma.profile.findUnique({ where: { userId } });
  if (existing) throw new ConflictException('El perfil ya existe');
  return this.prisma.profile.create({ data: { ...data, userId } });
}

async update(userId: number, data: UpdateProfileDto) {
  const existing = await this.prisma.profile.findUnique({ where: { userId } });
  if (!existing) throw new NotFoundException('El perfil no existe');
  return this.prisma.profile.update({ where: { userId }, data });
}
```

**Patrón base — Controller (userId desde JWT).**

```typescript
@Get('me')
getProfile(@Request() req) {
  return this.profileService.findByUserId(req.user.id);
}

@Post('me')
createProfile(@Request() req, @Body() dto: CreateProfileDto) {
  return this.profileService.create(req.user.id, dto);
}

@Patch('me')
updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
  return this.profileService.update(req.user.id, dto);
}
```

**Variantes / casos comunes.**

| Aspecto | Detalle |
|---|---|
| Schema | `userId Int @unique` en Profile hace la relación 1:1 |
| Guard | Sin `@Roles` → cualquier JWT válido pasa (JwtAuthGuard global lo exige) |
| Conflict | `findUnique` antes de `create`; si existe → `ConflictException` 409 |
| Not Found | `findUnique` antes de `update`; si no existe → `NotFoundException` 404 |
| GET sin perfil | `findUnique` retorna `null` — no lanza 404, retorna `null` directamente |

Diferencia One-to-One vs One-to-Many:

| | One-to-Many | One-to-One |
|---|-------------|------------|
| FK en el lado "muchos" | ✅ | ✅ |
| `@unique` en la FK | ❌ | ✅ obligatorio |
| Campo inverso | `Product[]` (array) | `Profile?` (opcional, sin array) |

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | Sin `@unique` en la FK, Prisma trata la relación como One-to-Many y el campo inverso es un array | La app compila pero el schema no refleja la intención — cada usuario podría tener múltiples perfiles. |
| 2 | `profile Profile?` con `?` — Prisma no incluye el perfil por defecto en queries de User | Hay que usar `include: { profile: true }` cuando se necesita el perfil anidado en el User. |
| 3 | Si un User no tiene Profile, `findUnique({ where: { userId } })` retorna `null` | El endpoint `GET /profile/me` debe retornar `null` en este caso, no lanzar 404. |
| 4 | `userId` siempre de `req.user.id` — nunca del body | Si se acepta en el body, un usuario podría crear/modificar el perfil de otro usuario. |

**Anti-patrones.**

- ❌ Aceptar `userId` en el DTO de creación o actualización de perfil
- ❌ Usar `@Roles('USER')` en endpoints de perfil — excluiría a los ADMINs de su propio perfil
- ❌ Olvidar `@unique` en `userId` del schema de Profile
- ❌ Crear el perfil sin verificar si ya existe (Prisma lanza `P2002` sin control)

**Prompt reutilizable.**

```
Crea el módulo de perfil en src/profile/.

Endpoints (todos requieren token, cualquier rol):
- GET /profile/me → ver mi perfil (retorna null si no existe, no 404)
- POST /profile/me → crear mi perfil (409 ConflictException si ya existe)
- PATCH /profile/me → actualizar mi perfil (404 NotFoundException si no existe)

userId siempre de req.user.id — nunca del body.
Todos los campos opcionales: phone, address, docType, docNumber.
```

**Code review específico.**

- [ ] `userId` tiene `@unique` en el schema de Prisma
- [ ] `userId` NO está en el DTO de creación/actualización
- [ ] Controller usa `req.user.id` para el `userId`, no `req.body.userId`
- [ ] `create` verifica existencia previa y lanza 409 si ya existe
- [ ] `update` verifica existencia previa y lanza 404 si no existe
- [ ] `findByUserId` retorna `null` (no lanza 404) cuando no existe perfil
- [ ] Sin `@Roles()` en los endpoints (cualquier usuario autenticado puede acceder)

---

### 6.18 Módulo de Órdenes ⭐

**Concepto.** El módulo de órdenes es el más complejo del proyecto: involucra transacciones, cálculo de precios, validaciones de stock, y permisos diferenciados por rol. La lógica de creación está envuelta en `prisma.$transaction` para garantizar atomicidad — si falla cualquier paso, todo se revierte. Dentro del callback solo se usa `tx` (nunca `this.prisma`) porque las queries fuera del callback escapan la transacción sin error visible.

El módulo también introduce acceso diferenciado: `GET /orders/:id` funciona tanto para ADMIN como para USER, pero el servicio devuelve 403 si un USER intenta ver una orden que no es suya. Cuando se agregan columnas `NOT NULL` sin default a tablas con datos existentes, `migrate dev` falla — se usa el flujo de migración manual con SQL explícito.

**Patrón base — Creación de orden.**

```typescript
async create(userId: number, dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const items = [];

    for (const item of dto.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundException(`Producto con id ${item.productId} no encontrado`);
      if (product.stock < item.quantity)
        throw new BadRequestException(`Stock insuficiente para ${product.name}`);

      const price = product.price;                              // precio congelado
      const discountPercent = item.discountPercent ?? 0;
      const discountAmount = price * discountPercent / 100;
      const finalPrice = price - discountAmount;
      const subtotal = finalPrice * item.quantity;
      totalAmount += subtotal;

      items.push({ productId: item.productId, quantity: item.quantity,
        price, discountPercent, discountAmount, finalPrice, subtotal });
    }

    const taxAmount = totalAmount * 0.19;
    const shippingCost = dto.paymentMethod === 'CONTRA_ENTREGA' ? 20000 : 15000;
    const grandTotal = totalAmount + taxAmount + shippingCost;

    return tx.order.create({
      data: {
        userId, status: 'PENDING', totalAmount, taxAmount, shippingCost, grandTotal,
        shippingAddress: dto.shippingAddress, billingAddress: dto.billingAddress,
        paymentMethod: dto.paymentMethod,
        items: { create: items },
      },
      include: { items: true },
    });
  });
}
```

**Patrón base — Migración con datos existentes.**

```bash
# 1. Crear el SQL manualmente con DEFAULT temporales
# 2. Aplicar directamente a la DB
npx prisma db execute --file prisma/migrations/<timestamp>_<name>/migration.sql
# 3. Registrar como aplicada (sin re-ejecutar)
npx prisma migrate resolve --applied <timestamp>_<name>
# 4. Regenerar el cliente
npx prisma generate
```

```sql
-- Ejemplo: agregar columna NOT NULL con datos existentes
ALTER TABLE "OrderItem" ADD COLUMN "price" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "OrderItem" SET "price" = "unitPrice";
ALTER TABLE "OrderItem" DROP COLUMN "unitPrice";
ALTER TABLE "OrderItem" ALTER COLUMN "price" DROP DEFAULT;
```

**Patrón base — Filtros de órdenes.**

```typescript
private buildWhere(filters: { status?; paymentMethod?; startDate?; endDate?; userId? }) {
  const { status, paymentMethod, startDate, endDate, userId } = filters;
  return {
    ...(userId !== undefined && { userId }),
    ...(status !== undefined && { status }),
    ...(paymentMethod !== undefined && { paymentMethod }),
    ...(startDate !== undefined || endDate !== undefined
      ? {
          createdAt: {
            ...(startDate !== undefined && { gte: new Date(startDate) }),
            ...(endDate !== undefined && { lte: new Date(endDate) }),
          },
        }
      : {}),
  };
}
```

**Variantes / casos comunes.**

Acceso diferenciado en `GET /orders/:id`:

```typescript
async findOne(id: number, requestingUser: { id: number; role: string }) {
  const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new NotFoundException(`Orden con id ${id} no encontrada`);
  if (requestingUser.role !== 'ADMIN' && order.userId !== requestingUser.id)
    throw new ForbiddenException('No tienes permiso para ver esta orden');
  return order;
}
```

**Gotchas.**

| # | Gotcha | Por qué importa |
|---|--------|-----------------|
| 1 | Dentro de `$transaction`, usar SIEMPRE `tx` — nunca `this.prisma` | Usar `this.prisma` dentro del callback escapa la transacción — los cambios no se revierten si algo falla después. Es el bug más silencioso del módulo. |
| 2 | `migrate dev` falla cuando hay columnas NOT NULL sin default en tablas con datos | PostgreSQL no puede rellenar filas históricas con un valor para la nueva columna. Usar el flujo manual: SQL + `db execute` + `migrate resolve`. |
| 3 | Parámetros de enum en query (`status`, `paymentMethod`) llegan como `string` al controller | Prisma acepta el string directamente para enums — no es necesario convertirlos. |
| 4 | Fechas de filtro (`startDate`, `endDate`) deben convertirse con `new Date(string)` | Prisma no acepta strings de fecha ISO para comparaciones `gte`/`lte` — necesita objetos `Date`. |
| 5 | La verificación de pertenencia de la orden debe estar en el servicio, no en el guard | El guard no tiene acceso al `order.userId` — esa lógica requiere leer la orden de la DB. |

**Anti-patrones.**

- ❌ Usar `this.prisma` dentro del callback de `$transaction` (rompe la atomicidad silenciosamente)
- ❌ Correr `migrate dev` cuando hay datos existentes y se agrega columna NOT NULL sin default
- ❌ Verificar la pertenencia de la orden en el controller o guard en lugar del servicio
- ❌ No validar el stock antes de crear la orden (permite vender stock insuficiente)

**Prompt reutilizable.**

```
Implementa el módulo de órdenes completo en src/orders/.

Endpoints:
- POST /orders → crear pedido (USER y ADMIN)
- GET /orders → listar todos (solo ADMIN) con paginación y filtros
- GET /orders/me → mis pedidos (USER y ADMIN) con paginación y filtros
- GET /orders/:id → detalle; ADMIN ve cualquiera, USER solo los suyos (403 si no es suyo)
- PATCH /orders/:id/status → actualizar estado (solo ADMIN)

Lógica de precios por item:
- price = precio del producto en DB (congelado al momento de la compra)
- discountAmount = price * discountPercent / 100
- finalPrice = price - discountAmount
- subtotal = finalPrice * quantity

Totales de la orden:
- totalAmount = suma de subtotales
- taxAmount = totalAmount * 0.19 (IVA Colombia)
- shippingCost = CONTRA_ENTREGA → 20000, otros métodos → 15000
- grandTotal = totalAmount + taxAmount + shippingCost

Validaciones: productId existe (404), stock suficiente (400).
Usar prisma.$transaction para crear Order + OrderItems atómicamente.
Dentro del $transaction, usar SOLO tx — nunca this.prisma.
```

**Code review específico.**

- [ ] Toda la lógica de creación está dentro de `prisma.$transaction`
- [ ] Dentro del callback, todas las queries usan `tx`, nunca `this.prisma`
- [ ] Stock validado ANTES de calcular precios y crear la orden
- [ ] `GET /orders/:id` verifica pertenencia cuando `req.user.role !== 'ADMIN'`
- [ ] Migraciones con columnas NOT NULL usaron el flujo manual (`db execute` + `migrate resolve`)
- [ ] `startDate`/`endDate` se convierten con `new Date()` antes de pasarlos a Prisma

---

## 7. Casos edge conocidos

Esta sección documenta bugs raros encontrados en producción o desarrollo, con su solución. Cada caso debe tener: contexto, problema, solución y, cuando aplique, referencia al capítulo relacionado.

### 7.1 Lost update en descuento de stock concurrente

**Contexto.** Dos usuarios hacen checkout simultáneamente del último producto en stock (`stock: 1`).

**Problema.** Sin lock pesimista, ambas requests leen `stock = 1`, ambas validan que hay suficiente, ambas crean su pedido, y ambas escriben `stock = 0`. Resultado: dos pedidos vendidos, una sola unidad real → faltante invisible.

**Solución.** Dentro del `prisma.$transaction`, leer cada producto con `tx.$queryRaw<Product[]>\`SELECT * FROM "Product" WHERE id = ${id} FOR UPDATE\`` antes de validar stock. PostgreSQL bloquea la fila hasta que la transacción termine; el segundo request espera, lee el stock actualizado, y falla la validación limpiamente.

**Capítulo relacionado.** 6.18 (Módulo de Órdenes)

---

*[Más casos se irán agregando aquí a medida que aparezcan]*

---

## 8. Tarjetas de estudio

### Tarjeta 1 — Prisma 7: los 3 gotchas de memoria

**1. `moduleFormat = "commonjs"`** — NestJS usa CommonJS. Sin esto la app compila pero falla en runtime.

**2. `url` va en `prisma.config.ts`, no en `schema.prisma`** — Prisma 7 separó la URL de conexión del schema. En el schema solo va el provider.

**3. Import desde `generated/prisma/client`** — Prisma 7 genera su propio cliente local. Nunca importes de `@prisma/client`.

---

### Tarjeta 2 — JWT: las piezas del flujo

| Pieza | Qué hace |
|---|---|
| `AuthService.login` | Valida email, compara password con bcrypt, verifica `isActive`, genera JWT firmado con `{ sub, email, role }` |
| Header | Se llama `Authorization`. El valor es `Bearer <token>`. |
| `JwtStrategy` | Verifica el token con `JWT_SECRET`. Inyecta `{ id, email, role }` en `req.user` |
| `JwtAuthGuard` | Autenticación — "¿quién eres?". Sin token o token inválido → 401. `@Public()` lo bypassa. |
| `RolesGuard` | Autorización — "¿tienes permiso?". Token válido pero rol insuficiente → 403. Corre **después** de `JwtAuthGuard`. |

---

### Tarjeta 3 — Concurrencia: pesimista vs optimista

| | Pesimista | Optimista |
|---|-----------|-----------|
| Mecanismo | Lock con `SELECT ... FOR UPDATE` | Operación atómica condicional |
| Bloqueo | Sí | No |
| Cuándo usar | Conflictos probables, stock real escaso | Conflictos raros, alta concurrencia |
| Ejemplo | Ecommerce de tienda pequeña | Sistema de reservas masivas |
| En este proyecto | ✅ Pesimista (justificado por el dominio) | ❌ |

---

## 9. Comandos útiles (Windows)

### Matar un proceso en un puerto

```bash
netstat -ano | findstr :3000
taskkill /PID <numero> /F
```

### Equivalencia Linux/Mac

```bash
# Windows: taskkill /PID 1234 /F
# Linux/Mac: kill -9 1234
```

---

## 10. Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| `2.1.0` | 2026-04-13 | **MINOR** — Migrados todos los capítulos pendientes al formato v2 estándar (6.1, 6.2, 6.3, 6.5–6.11, 6.13–6.18). Cada capítulo ahora incluye Concepto, Patrón base, Gotchas con 3 columnas, Anti-patrones, Prompt reutilizable y Code review específico. |
| `2.0.0` | 2026-04-13 | **MAJOR** — Reestructura completa del playbook al formato v2: agregadas secciones de Reglas innegociables, Convenciones, Code review checklist, Reglas de actualización, Casos edge conocidos, Changelog. Capítulos 6.4 (Prisma 7 base) y 6.12 (JWT) migrados al formato estándar v2 como referencia. Resto de capítulos pendientes de migración. |
| `1.0.0` | (anterior) | Versión inicial (heredada del PLAYBOOK.md previo). |
