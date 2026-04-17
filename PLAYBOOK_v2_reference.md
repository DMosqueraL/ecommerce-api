# NestJS + Claude Code — Playbook

> **Proyecto:** ecommerce-api
> **Stack:** NestJS · Prisma 7 · PostgreSQL · TypeScript · JWT
> **Propósito:** referencia técnica y prompts reutilizables para desarrollo asistido por Claude Code.
> **Versión:** `2.0.0`
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
   - 6.1 [Inicio del proyecto](#61-inicio-del-proyecto)
   - 6.2 [Módulos y arquitectura](#62-módulos-y-arquitectura)
   - 6.3 [Validación con class-validator](#63-validación-con-class-validator)
   - 6.4 [Prisma 7: integración base](#64-prisma-7-integración-base) ⭐ *migrado al formato v2*
   - 6.5 [Prisma 7: relaciones](#65-prisma-7-relaciones)
   - 6.6 [Prisma 7: queries con include](#66-prisma-7-queries-con-include)
   - 6.7 [Prisma 7: validación de FK](#67-prisma-7-validación-de-fk)
   - 6.8 [Prisma 7: seeding](#68-prisma-7-seeding)
   - 6.9 [Prisma 7: upsert](#69-prisma-7-upsert)
   - 6.10 [Paginación](#610-paginación)
   - 6.11 [Filtros dinámicos](#611-filtros-dinámicos)
   - 6.12 [Autenticación JWT](#612-autenticación-jwt) ⭐ *migrado al formato v2*
   - 6.13 [Guards y Roles](#613-guards-y-roles)
   - 6.14 [Manejo de errores](#614-manejo-de-errores)
   - 6.15 [Swagger](#615-swagger)
   - 6.16 [Variables de entorno con Joi](#616-variables-de-entorno-con-joi)
   - 6.17 [Módulo de Perfil (One-to-One)](#617-módulo-de-perfil-one-to-one)
   - 6.18 [Módulo de Órdenes](#618-módulo-de-órdenes)
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

> **Nota:** los capítulos marcados con ⭐ ya están migrados al formato v2 estándar. Los demás siguen el formato v1 y deben migrarse usando el prompt al final de este documento.

### 6.1 Inicio del proyecto

*[Pendiente migrar al formato v2]*

```
Analiza este proyecto NestJS y dime qué archivos tiene, su estructura,
y qué está implementado hasta ahora.
```

```
Crea el CLAUDE.md inicial para este proyecto NestJS con los comandos de desarrollo,
arquitectura general y configuración de TypeScript relevante.
```

---

### 6.2 Módulos y arquitectura

*[Pendiente migrar al formato v2]*

---

### 6.3 Validación con class-validator

*[Pendiente migrar al formato v2]*

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

### 6.5 Prisma 7: relaciones

*[Pendiente migrar al formato v2]*

---

### 6.6 Prisma 7: queries con include

*[Pendiente migrar al formato v2]*

---

### 6.7 Prisma 7: validación de FK

*[Pendiente migrar al formato v2]*

---

### 6.8 Prisma 7: seeding

*[Pendiente migrar al formato v2]*

---

### 6.9 Prisma 7: upsert

*[Pendiente migrar al formato v2]*

---

### 6.10 Paginación

*[Pendiente migrar al formato v2]*

---

### 6.11 Filtros dinámicos

*[Pendiente migrar al formato v2]*

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

- **Refrescar tokens:** se hace con un endpoint `POST /auth/refresh` que recibe el token actual (válido aún) y emite uno nuevo con `expiresIn` extendido
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

### 6.13 Guards y Roles

*[Pendiente migrar al formato v2]*

---

### 6.14 Manejo de errores

*[Pendiente migrar al formato v2]*

---

### 6.15 Swagger

*[Pendiente migrar al formato v2]*

---

### 6.16 Variables de entorno con Joi

*[Pendiente migrar al formato v2]*

---

### 6.17 Módulo de Perfil (One-to-One)

*[Pendiente migrar al formato v2]*

---

### 6.18 Módulo de Órdenes

*[Pendiente migrar al formato v2]*

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

**2. `url` va en `prisma.config.ts`, no en `schema.prisma`** — Prisma 7 separó la URL del schema. En el schema solo va el provider.

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
| `2.0.0` | 2026-04-13 | **MAJOR** — Reestructura completa del playbook al formato v2: agregadas secciones de Reglas innegociables, Convenciones, Code review checklist, Reglas de actualización, Casos edge conocidos, Changelog. Capítulos 6.4 (Prisma 7 base) y 6.12 (JWT) migrados al formato estándar v2 (Concepto → Patrón base → Variantes → Gotchas 3 columnas → Anti-patrones → Prompt → Checklist) como referencia. Resto de capítulos pendientes de migración. |
| `1.0.0` | (anterior) | Versión inicial (heredada del PLAYBOOK.md previo). |

---

## Apéndice: Prompt para migrar capítulos pendientes al formato v2

Cuando quieras que Claude Code migre los capítulos restantes (6.1, 6.2, 6.3, 6.5–6.11, 6.13–6.18) al formato v2, usa este prompt:

````markdown
# Tarea: Migrar capítulos del PLAYBOOK.md al formato v2

## Contexto
PLAYBOOK.md tiene varios capítulos en la sección 6 marcados como "Pendiente migrar al formato v2".
Los capítulos 6.4 (Prisma 7 integración base) y 6.12 (Autenticación JWT) ya están migrados
y sirven como referencia visual del formato esperado.

## Qué hacer
Migrar el capítulo [6.X - nombre] del formato v1 al formato v2 estándar.

## Formato v2 obligatorio (estructura interna del capítulo)

```markdown
### 6.X [Nombre del capítulo] ⭐

**Concepto.** [2-4 párrafos. Empieza con el problema que el patrón resuelve. Da contexto del por qué, no solo el qué.]

**Patrón base.**
```código de referencia```

**Variantes / casos comunes.** [Si aplica]

**Gotchas.**
| # | Gotcha | Por qué importa |
|---|--------|-----------------|

**Anti-patrones.** [Lista de cosas que NO se deben hacer, con razón]

**Prompt reutilizable.**
```prompt parametrizado con [variables]```

**Code review específico.**
- [ ] item 1
- [ ] item 2
```

## Reglas innegociables al migrar

1. NO inventes contenido — solo reformatea lo que ya existe en el capítulo v1.
2. Si el capítulo v1 no tenía sección de "anti-patrones", deduce 2-3 a partir de los gotchas existentes.
3. Si el capítulo v1 no tenía "code review específico", crea uno deduciéndolo de los gotchas.
4. La columna "Por qué importa" en gotchas DEBE explicar la consecuencia real, no parafrasear el gotcha.
5. NO toques otros capítulos en la misma operación — un capítulo a la vez.
6. Marca el capítulo con ⭐ en el título cuando esté migrado.
7. Actualiza el índice (sección 2 del documento) marcando ese capítulo con ⭐.
8. Incrementa la versión: cada capítulo migrado es PATCH (2.0.0 → 2.0.1 → 2.0.2 ...).
9. Actualiza el changelog (sección 10) con el cambio.

## Después de migrar
Muéstrame un diff del capítulo migrado antes de guardar.
````
