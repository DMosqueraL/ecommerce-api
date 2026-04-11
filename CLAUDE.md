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
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | — |

`.env` is git-ignored. `.env.example` (with placeholder values) is committed as reference. `ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })` is registered in `AppModule`, so `ConfigService` is injectable anywhere without reimporting. `main.ts` reads `PORT` via `configService.get<number>('PORT', 3000)`.

### Validation

`src/config/env.validation.ts` defines a Joi schema that runs at startup:

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
});
```

If `DATABASE_URL` or `JWT_SECRET` is missing the app refuses to start with:
```
Error: Config validation error: "DATABASE_URL" is required
```

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
Category   id (PK), name (unique)
Product    id (PK), name, description, stock, price, categoryId (FK → Category)
User       id (PK), email (unique), password, role (Role enum), isActive, createdAt, updatedAt
Profile    id (PK), phone?, address?, docType?, docNumber?, userId (FK → User, unique)
Order      id (PK), userId (FK → User), status (OrderStatus), totalAmount, shippingCost,
           taxAmount, grandTotal, shippingAddress, billingAddress, paymentMethod (PaymentMethod),
           shippingCompany, trackingNumber, carrierPhone, createdAt, updatedAt
OrderItem  id (PK), orderId (FK → Order), productId (FK → Product), quantity,
           price, discountPercent, discountAmount, finalPrice, subtotal
```

Category → Product is a **One-to-Many** relationship (`categoryId` is required on every product).

User → Profile is a **One-to-One** relationship (`userId` is unique on Profile). Profile is optional — a User can exist without a Profile.

User → Order is a **One-to-Many** relationship. Order → OrderItem is a **One-to-Many** relationship.

The `Role` enum has three values: `ADMIN`, `USER`, `GUEST`. Default is `USER`.

The `OrderStatus` enum: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`. Default is `PENDING`.

The `PaymentMethod` enum: `TARJETA`, `TRANSFERENCIA`, `CONTRA_ENTREGA`.

The `isActive` field (`Boolean`, default `true`) controls whether a user can log in. If `false`, login is rejected with `401 "Tu cuenta está bloqueada. Contacta al administrador."`

The seed (`npx prisma db seed`) creates two users with hashed passwords:

| Email | Password | Role |
|-------|----------|------|
| `admin@ecommerce.com` | `Admin123!` | ADMIN |
| `user@ecommerce.com` | `User123!` | USER |

## Architecture

Standard NestJS module architecture:

- **`src/main.ts`** — Bootstrap; registers global `HttpExceptionFilter` and `ValidationPipe`; configures SwaggerModule at `/api`; reads `PORT` from `ConfigService`.
- **`src/app.module.ts`** — Root module; imports `ConfigModule` (global, with Joi validation) and feature modules. Registers `JwtAuthGuard` and `RolesGuard` as global `APP_GUARD` providers (in that order).
- **`src/config/env.validation.ts`** — Joi schema for startup env var validation.
- **`src/common/filters/`** — Global filters shared across the whole app.
- **`src/common/guards/`** — Global guards: `RolesGuard` reads the `@Roles()` metadata and throws `403` if the user's role is not in the allowed list.
- **`src/common/decorators/`** — Shared decorators: `@Public()` marks a route as unauthenticated; `@Roles(...roles)` restricts a route to specific roles.
- Feature modules go under `src/<feature>/` following the pattern: `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, and a `dto/` subfolder.

NestJS uses decorator-based dependency injection. Controllers handle HTTP routing (`@Controller`, `@Get`, etc.), services contain business logic (`@Injectable`), and modules wire them together (`@Module`).

## Users module

`src/users/` — controller + service. All endpoints require `@Roles('ADMIN')`.

Endpoints (`/users`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users (paginated, no passwords) |
| GET | `/users/:id` | Get one user (no password); 404 if not found |
| PATCH | `/users/:id/role` | Change role; body `{ role: 'ADMIN' \| 'USER' \| 'GUEST' }` |
| PATCH | `/users/:id/block` | Block/unblock; body `{ isActive: boolean }` |
| DELETE | `/users/:id` | Delete user (204); 404 if not found |

`UsersService` methods:

| Method | Description |
|--------|-------------|
| `findByEmail(email)` | Look up by email; returns `null` if not found (used by AuthService) |
| `findById(id)` | Look up by PK |
| `create(data)` | Create a new user record |
| `findAll(page, limit)` | Paginated list; `password` excluded via `select` |
| `findOneOrFail(id)` | Find by PK; throws `404` if not found; `password` excluded |
| `updateRole(id, role)` | Update role field; throws `404` if not found |
| `updateBlock(id, isActive)` | Update `isActive` field; throws `404` if not found |
| `remove(id)` | Delete user; throws `404` if not found |

`UsersModule` exports `UsersService` so `AuthModule` can inject it.

## Auth module

`src/auth/` — handles registration, login, and JWT validation.

Endpoints (`/auth`):

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Create account; returns user without password |
| POST | `/auth/login` | Public | Validate credentials; returns `{ access_token }` |

**`AuthService.register`** — checks email uniqueness, hashes password with `bcrypt` (salt 10), persists via `UsersService.create`. Returns user object with `password` field stripped.

**`AuthService.login`** — finds user by email, compares password with `bcrypt.compare`, checks `isActive === true`, then signs a JWT with payload `{ sub, email, role }` and 7-day expiry.

**`JwtStrategy`** (`src/auth/jwt.strategy.ts`) — `PassportStrategy(Strategy)` that extracts the Bearer token, verifies it with `JWT_SECRET`, and returns `{ id, email, role }` into `req.user`.

**`JwtAuthGuard`** (`src/auth/jwt-auth.guard.ts`) — extends `AuthGuard('jwt')`. Before delegating to Passport, checks the `isPublic` metadata: if the route is decorated with `@Public()`, it returns `true` immediately without validating any token. Registered globally via `APP_GUARD`.

## Guards and decorators

| File | What it does |
|------|-------------|
| `src/common/decorators/public.decorator.ts` | `@Public()` — sets `isPublic: true` metadata; skips JWT validation |
| `src/common/decorators/roles.decorator.ts` | `@Roles('ADMIN')` — sets `roles` metadata; checked by `RolesGuard` |
| `src/common/guards/roles.guard.ts` | Reads `roles` metadata; throws `403 ForbiddenException` if `req.user.role` is not in the list |

Both guards are registered globally in `AppModule` as `APP_GUARD`. Order matters: `JwtAuthGuard` runs first (authentication), then `RolesGuard` (authorization).

### Endpoint access matrix

| Endpoint | No token | USER token | ADMIN token |
|----------|----------|------------|-------------|
| `GET /products` | ✅ | ✅ | ✅ |
| `GET /products/:id` | ✅ | ✅ | ✅ |
| `POST /products` | ❌ 401 | ❌ 403 | ✅ |
| `PUT /products/:id` | ❌ 401 | ❌ 403 | ✅ |
| `PATCH /products/:id` | ❌ 401 | ❌ 403 | ✅ |
| `DELETE /products/:id` | ❌ 401 | ❌ 403 | ✅ |
| `GET /categories` | ✅ | ✅ | ✅ |
| `GET /categories/:id` | ✅ | ✅ | ✅ |
| `POST /categories` | ❌ 401 | ❌ 403 | ✅ |
| `PUT /categories/:id` | ❌ 401 | ❌ 403 | ✅ |
| `DELETE /categories/:id` | ❌ 401 | ❌ 403 | ✅ |
| `POST /auth/register` | ✅ | ✅ | ✅ |
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `GET /users` | ❌ 401 | ❌ 403 | ✅ |
| `GET /users/:id` | ❌ 401 | ❌ 403 | ✅ |
| `PATCH /users/:id/role` | ❌ 401 | ❌ 403 | ✅ |
| `PATCH /users/:id/block` | ❌ 401 | ❌ 403 | ✅ |
| `DELETE /users/:id` | ❌ 401 | ❌ 403 | ✅ |
| `GET /profile/me` | ❌ 401 | ✅ | ✅ |
| `POST /profile/me` | ❌ 401 | ✅ | ✅ |
| `PATCH /profile/me` | ❌ 401 | ✅ | ✅ |
| `POST /orders` | ❌ 401 | ✅ | ✅ |
| `GET /orders` | ❌ 401 | ❌ 403 | ✅ |
| `GET /orders/me` | ❌ 401 | ✅ | ✅ |
| `GET /orders/:id` | ❌ 401 | ✅ (own only) | ✅ |
| `PATCH /orders/:id/status` | ❌ 401 | ❌ 403 | ✅ |

## Profile module

`src/profile/` — endpoints for the authenticated user to manage their own profile. No `@Roles` needed — any valid JWT passes.

Endpoints (`/profile`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile/me` | View my profile (returns `null` if none exists) |
| POST | `/profile/me` | Create my profile; 409 if already exists |
| PATCH | `/profile/me` | Partial update; 404 if profile does not exist |

`userId` is always taken from `req.user.id` — users can only access their own profile.

`ProfileService` methods:

| Method | Description |
|--------|-------------|
| `findByUserId(userId)` | Returns profile or `null` |
| `create(userId, data)` | Creates profile; throws `409 ConflictException` if one already exists |
| `update(userId, data)` | Partial update; throws `404 NotFoundException` if none exists |

All four fields (`phone`, `address`, `docType`, `docNumber`) are optional in both `CreateProfileDto` and `UpdateProfileDto`.

## Orders module

`src/orders/` — order creation and management.

Endpoints (`/orders`):

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/orders` | USER, ADMIN | Create order |
| GET | `/orders` | ADMIN | List all orders (paginated + filtered) |
| GET | `/orders/me` | USER, ADMIN | My orders (paginated + filtered) |
| GET | `/orders/:id` | USER, ADMIN | Detail; USER can only view own orders (403 otherwise) |
| PATCH | `/orders/:id/status` | ADMIN | Update order status |

### Order creation logic (`OrdersService.create`)

1. Validates each `productId` exists — throws `404` if not found.
2. Validates stock is sufficient — throws `400` if not.
3. Per-item price calculation:
   - `price` = product price at time of purchase (frozen)
   - `discountAmount` = `price * discountPercent / 100` (default `discountPercent = 0`)
   - `finalPrice` = `price - discountAmount`
   - `subtotal` = `finalPrice * quantity`
4. Order totals:
   - `totalAmount` = sum of subtotals
   - `taxAmount` = `totalAmount * 0.19` (19% IVA)
   - `shippingCost` = `20000` if `CONTRA_ENTREGA`, else `15000`
   - `grandTotal` = `totalAmount + taxAmount + shippingCost`
5. Wrapped in `prisma.$transaction` — Order + all OrderItems created atomically.

### Filters

`GET /orders` and `GET /orders/me` support these optional query params:

| Param | Type | Available on |
|-------|------|-------------|
| `status` | `OrderStatus` enum | both |
| `paymentMethod` | `PaymentMethod` enum | both |
| `startDate` | ISO date string | both |
| `endDate` | ISO date string | both |
| `userId` | integer | ADMIN only (`GET /orders`) |

The `where` object is built dynamically via `buildWhere()` — same spread-conditional pattern as products. `startDate`/`endDate` map to `createdAt: { gte, lte }`.

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
| GET | `/categories` | List all (paginated) |
| GET | `/categories/:id` | Get one |
| POST | `/categories` | Create |
| PUT | `/categories/:id` | Full replace — all fields required |
| DELETE | `/categories/:id` | Remove (204) |

`CreateCategoryDto` has a single required field: `name` (unique in DB). `UpdateCategoryDto` uses `PartialType(CreateCategoryDto)`.

`findAll` and `findOne` include `{ products: true }` — every category response contains its full list of products.

### Pagination

`GET /categories` supports the same `page`/`limit` query params as `/products` (defaults: `page=1`, `limit=10`), with the same `{ data, total, page, limit, totalPages }` response shape.

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

## Swagger

The interactive API docs are served at `http://localhost:3000/api` (configured in `src/main.ts`):

```typescript
const config = new DocumentBuilder()
  .setTitle('Ecommerce API')
  .setDescription('API para gestión de productos y categorías')
  .setVersion('1.0')
  .build();
SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
```

### Decorators in use

| Decorator | Location | Purpose |
|-----------|----------|---------|
| `@ApiTags('products')` | `ProductsController` | Groups endpoints under the "products" tag |
| `@ApiTags('categories')` | `CategoriesController` | Groups endpoints under the "categories" tag |
| `@ApiProperty({ description, example })` | DTO fields | Documents schema fields with descriptions and example values |

`@ApiProperty` is added only to the base `CreateProductDto` and `CreateCategoryDto`. `ReplaceProductDto` and `UpdateProductDto` inherit the decorators automatically via class extension and `PartialType`.

## TypeScript Configuration

- Target: ES2023, module resolution: `nodenext`
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled (required for NestJS DI)
- `noImplicitAny` is **disabled** — type annotations are optional but encouraged
- Compiled output goes to `dist/`, which is cleaned on each build (`deleteOutDir: true`)
- Types used in decorated method signatures must use `import type` (required by `isolatedModules` + `emitDecoratorMetadata`)
