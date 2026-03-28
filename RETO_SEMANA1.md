# 🛒 Reto de la Semana — E-commerce API

## Stack
- NestJS + Prisma + PostgreSQL
- JWT para autenticación

---

## 📦 Entidades y su estructura

### User
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  role      String   @default("customer") // "admin" o "customer"
  createdAt DateTime @default(now())
  orders    Order[]
}
```

### Product
```prisma
model Product {
  id          Int         @id @default(autoincrement())
  name        String
  description String
  price       Float
  stock       Int
  createdAt   DateTime    @default(now())
  orderItems  OrderItem[]
}
```

### Order
```prisma
model Order {
  id         Int         @id @default(autoincrement())
  userId     Int
  total      Float
  status     String      @default("pending") // "pending", "completed", "cancelled"
  createdAt  DateTime    @default(now())
  user       User        @relation(fields: [userId], references: [id])
  items      OrderItem[]
}
```

### OrderItem
```prisma
model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  productId Int
  quantity  Int
  price     Float
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
}
```

---

## 🗂️ Módulos requeridos

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
├── users/
│   ├── users.module.ts
│   ├── users.service.ts
│   └── users.controller.ts
├── products/
│   ├── products.module.ts
│   ├── products.service.ts
│   ├── products.controller.ts
│   └── dto/
│       └── create-product.dto.ts
├── orders/
│   ├── orders.module.ts
│   ├── orders.service.ts
│   ├── orders.controller.ts
│   └── dto/
│       └── create-order.dto.ts
├── prisma.service.ts
└── app.module.ts
```

---

## 🛣️ Rutas requeridas

### Auth
```
POST /auth/register   → crea un usuario (role: customer por defecto)
POST /auth/login      → devuelve el JWT
```

### Products
```
GET    /products        → público (cualquiera puede ver los productos)
GET    /products/:id    → público
POST   /products        → solo admin
PATCH  /products/:id    → solo admin
DELETE /products/:id    → solo admin
```

### Orders
```
POST  /orders            → cliente autenticado (crea una orden)
GET   /orders            → solo admin (ve todas las órdenes)
GET   /orders/my-orders  → cliente autenticado (ve sus propias órdenes)
```

---

## 📋 Pasos sugeridos

### 1. Configurar el proyecto
```bash
npm install prisma --save-dev
npm install @prisma/client @prisma/adapter-pg
npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install --save-dev @types/passport-jwt @types/bcrypt dotenv
npx prisma init
```

### 2. Configurar `.env`
```
DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/ecommerce?schema=public"
JWT_SECRET=tu_clave_secreta
```

### 3. Definir el schema en `prisma/schema.prisma`
Copia las entidades de arriba y ejecuta:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Crear el PrismaService
```typescript
// src/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

### 5. Construir en este orden
1. `AuthModule` — register, login, JWT
2. `ProductsModule` — CRUD completo
3. `OrdersModule` — crear y consultar órdenes

---

## ⭐ El reto extra — RolesGuard

Necesitas un Guard que diferencie admin de customer.

El JWT incluye el `role` del usuario en el payload:
```typescript
// En AuthService.login()
const payload = { sub: user.id, email: user.email, role: user.role };
```

El RolesGuard lee ese role y decide si el usuario puede continuar:
```typescript
// src/auth/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.get<string>('role', context.getHandler());
    if (!requiredRole) return true;
    const { user } = context.switchToHttp().getRequest();
    return user.role === requiredRole;
  }
}
```

Y un decorador personalizado para usarlo:
```typescript
// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const Role = (role: string) => SetMetadata('role', role);
```

Uso en el controlador:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
@Post()
createProduct(@Body() dto: CreateProductDto) {
  return this.productsService.createProduct(dto);
}
```

---

## 📝 DTOs requeridos

### CreateProductDto
```typescript
import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsPositive()
  stock: number;
}
```

### CreateOrderDto
```typescript
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  productId: number;
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

---

## 🔄 Flujo de Git durante el reto

Cada vez que termines una funcionalidad:
```bash
git add .
git commit -m "feat: descripción de lo que hiciste"
git push
```

Ejemplos:
```bash
git commit -m "feat: add prisma schema with all entities"
git commit -m "feat: add auth module with JWT"
git commit -m "feat: add products CRUD with admin guard"
git commit -m "feat: add orders module with relations"
```

---

## ✅ Checklist final

- [ ] AuthModule — register y login funcionando
- [ ] JWT generado correctamente en login
- [ ] ProductsModule — GET público sin token
- [ ] ProductsModule — POST/PATCH/DELETE solo con token de admin
- [ ] OrdersModule — POST crea una orden con sus items
- [ ] OrdersModule — GET /orders solo admin
- [ ] OrdersModule — GET /orders/my-orders solo el usuario autenticado
- [ ] RolesGuard diferencia admin de customer
- [ ] Variables de entorno en `.env`
- [ ] Código subido a GitHub con commits descriptivos

---

## 🆘 Cuándo pedir ayuda

- Cuando lleves más de 30 minutos atascada en el mismo error
- Cuando el error no tiene sentido después de revisarlo bien
- Cuando termines y quieras feedback del código

¡Mucho éxito! 🚀
