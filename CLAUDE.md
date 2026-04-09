# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS ecommerce API — a course project being built progressively. The app runs on port 3000 by default (overridable via `PORT` env var).

## Commands

```bash
# Development
npm run start:dev       # Start with hot reload (watch mode)
npm run start:debug     # Start with debugger attached

# Build & Production
npm run build           # Compile TypeScript to dist/
npm run start:prod      # Run compiled output

# Code quality
npm run lint            # ESLint with auto-fix
npm run format          # Prettier format src/ and test/

# Testing
npm test                # Run unit tests (Jest, watches src/**/*.spec.ts)
npm run test:watch      # Run tests in watch mode
npm run test:cov        # Run tests with coverage report
npm run test:e2e        # Run e2e tests (test/jest-e2e.json config)
```

To run a single test file:
```bash
npx jest src/path/to/file.spec.ts
```

## Environment variables

Configuration is managed with `@nestjs/config`. Copy `.env.example` to `.env` and fill in the values before running the app.

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |

`.env` is git-ignored. `.env.example` (no values) is committed as reference. `ConfigModule.forRoot({ isGlobal: true })` is registered in `AppModule`, so `ConfigService` is injectable anywhere without reimporting. `main.ts` reads `PORT` via `configService.get<number>('PORT', 3000)`.

## Database

The app uses **Prisma 7** with **PostgreSQL**.

- Schema: `prisma/schema.prisma`
- Generated client output: `generated/prisma/` (commonjs format)
- `PrismaService` (`src/prisma/`) wraps the generated client and is provided via `PrismaModule` (global).

Useful Prisma commands:

```bash
npx prisma migrate dev --name <migration_name>   # Create and apply a migration
npx prisma migrate deploy                         # Apply pending migrations (prod)
npx prisma studio                                 # Open visual DB browser
npx prisma generate                               # Regenerate client after schema change
npx prisma db seed                                # Run the seed script
```

### Seeding

The seed script lives at `prisma/seed.ts` and is configured in `prisma.config.ts` (Prisma 7 reads seed config from there, not `package.json`):

```typescript
// prisma.config.ts
migrations: {
  path: "prisma/migrations",
  seed: "tsx prisma/seed.ts",   // tsx handles Prisma 7 ESM imports correctly
},
```

`ts-node` does not work for seeds in this project — the generated client uses `.js` ESM imports that `ts-node` (CommonJS mode) cannot resolve. Use `tsx` instead.

The seed populates 5 categories (Electrónica, Ropa, Hogar, Deportes, Ferretería) with 5 products each (25 total), priced in COP. It calls `deleteMany` on both tables before inserting so it is safe to run multiple times.

### Schema models

```
Category  id (PK), name (unique)
Product   id (PK), name, description, stock, price, categoryId (FK → Category)
```

Category → Product is a **One-to-Many** relationship (`categoryId` is required on every product).

## Architecture

Standard NestJS module architecture:

- **`src/main.ts`** — Bootstrap; registers global `HttpExceptionFilter` and `ValidationPipe`; reads `PORT` from `ConfigService`.
- **`src/app.module.ts`** — Root module; imports `ConfigModule` (global) and feature modules.
- **`src/common/filters/`** — Global filters shared across the whole app.
- Feature modules go under `src/<feature>/` following the pattern: `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, and a `dto/` subfolder.

NestJS uses decorator-based dependency injection. Controllers handle HTTP routing (`@Controller`, `@Get`, etc.), services contain business logic (`@Injectable`), and modules wire them together (`@Module`).

## Products module

Endpoints (`/products`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List all |
| GET | `/products/:id` | Get one |
| POST | `/products` | Create |
| PUT | `/products/:id` | Full replace — all fields required |
| PATCH | `/products/:id` | Partial update — only sent fields updated |
| DELETE | `/products/:id` | Remove (204) |

PUT and PATCH are intentionally distinct: PUT replaces the entire resource, PATCH merges only the provided fields.

Data is persisted in PostgreSQL via Prisma. `ProductsService` uses `PrismaService` directly — no repository layer. Each product requires a valid `categoryId`.

`findAll` and `findOne` include `{ category: true }` — every response contains the full category object nested inside the product.

`create`, `replace`, and `patch` validate that `categoryId` exists before writing to the DB. If the category is not found, a `NotFoundException` is thrown (`"Categoría con id ${id} no encontrada"`). In `patch`, the validation is skipped when `categoryId` is not present in the body.

### Pagination

`GET /products` supports optional `page` and `limit` query params (defaults: `page=1`, `limit=10`).

`findAll` runs `findMany` and `count` in parallel with `Promise.all` and returns:

```json
{ "data": [...], "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
```

`count` receives the same `where` object as `findMany` so totals always reflect the active filters.

### Filters

`GET /products` also supports these optional query params:

| Param | Type | Description |
|-------|------|-------------|
| `categoryId` | integer | Filter by category |
| `minPrice` | float | Minimum price (inclusive) |
| `maxPrice` | float | Maximum price (inclusive) |
| `search` | string | Substring match on `name` or `description` (case-insensitive) |

The `where` object is built dynamically — only params that are present in the request are included. Pattern:

```typescript
const where = {
  ...(categoryId !== undefined && { categoryId }),
  ...(minPrice !== undefined || maxPrice !== undefined
    ? { price: { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) } }
    : {}),
  ...(search !== undefined && {
    OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ],
  }),
};
```

In the controller, `categoryId` uses `ParseIntPipe({ optional: true })` and `minPrice`/`maxPrice` use `ParseFloatPipe({ optional: true })`; `search` is a plain `@Query('search')` string.

## Categories module

Endpoints (`/categories`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List all |
| GET | `/categories/:id` | Get one |
| POST | `/categories` | Create |
| PUT | `/categories/:id` | Full replace — all fields required |
| DELETE | `/categories/:id` | Remove (204) |

`CreateCategoryDto` has a single required field: `name` (unique in DB). `UpdateCategoryDto` uses `PartialType(CreateCategoryDto)`.

## DTOs and validation

DTOs live in `src/<feature>/dto/`. All validation messages are in Spanish.

- `CreateProductDto` — defines all fields with `class-validator` decorators and Spanish messages.
- `ReplaceProductDto` — extends `CreateProductDto` directly (no changes needed).
- `UpdateProductDto` — uses `PartialType(CreateProductDto)` from `@nestjs/mapped-types`; inherits all decorators and makes every field optional.

`ValidationPipe` is registered globally with `whitelist: true` (strips unknown fields).

When adding a new DTO field, only update the base `CreateProductDto` — the other two inherit automatically.

## Error response format

All errors go through `HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`) and return a consistent shape:

Single message (e.g. 404):
```json
{ "statusCode": 404, "message": "Producto con id 6 no encontrado", "timestamp": "...", "path": "..." }
```

Validation errors (400) — `errors` array only appears when there are multiple messages:
```json
{ "statusCode": 400, "message": "Error de validación", "errors": ["El nombre del producto es obligatorio"], "timestamp": "...", "path": "..." }
```

## TypeScript Configuration

- Target: ES2023, module resolution: `nodenext`
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled (required for NestJS DI)
- `noImplicitAny` is **disabled** — type annotations are optional but encouraged
- Compiled output goes to `dist/`, which is cleaned on each build (`deleteOutDir: true`)
- Types used in decorated method signatures must use `import type` (required by `isolatedModules` + `emitDecoratorMetadata`)
