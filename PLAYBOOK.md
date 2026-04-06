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
