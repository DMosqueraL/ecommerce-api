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

`.env` is git-ignored. `.env.example` (no values) is committed as reference. `ConfigModule.forRoot({ isGlobal: true })` is registered in `AppModule`, so `ConfigService` is injectable anywhere without reimporting. `main.ts` reads `PORT` via `configService.get<number>('PORT', 3000)`.

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

Data is stored in an in-memory array in `ProductsService` (no database yet).

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
