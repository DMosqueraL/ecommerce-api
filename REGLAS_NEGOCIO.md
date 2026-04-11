# Reglas de negocio

## Roles y permisos
- ADMIN: acceso total — gestionar productos, categorías, usuarios y todos los pedidos
- USER: puede comprar, ver sus propios pedidos y gestionar su perfil
- GUEST: solo puede ver productos y categorías (sin comprar)

## Usuarios
- El email no se puede cambiar una vez registrado
- El documento de identidad no se puede cambiar
- Un usuario bloqueado (isActive=false) no puede hacer login
  → Error: "Tu cuenta está bloqueada. Contacta al administrador."
- Solo el ADMIN puede cambiar roles y bloquear usuarios
- El primer ADMIN se crea via seed

## Perfil
- Un usuario solo puede tener un perfil (One-to-One)
- Si intenta crear un segundo perfil → 409 Conflict
- Todos los campos del perfil son opcionales

## Productos
- Solo ADMIN puede crear, editar y eliminar productos
- Cualquiera (sin token) puede ver productos y categorías
- Cada producto debe pertenecer a una categoría válida
- Si el categoryId no existe → 404 Not Found

## Pedidos
- Solo usuarios autenticados pueden crear pedidos (USER y ADMIN)
- El precio del producto se congela al momento de la compra
- Un USER solo puede ver sus propios pedidos
- El ADMIN puede ver todos los pedidos
- IVA del 19% sobre el totalAmount
- Envío estándar: $15.000 COP (TARJETA y TRANSFERENCIA)
- Contra entrega: $20.000 COP (recargo por riesgo)
- Siempre hay envío — no existe recogida en tienda
- Se puede aplicar descuento por item (discountPercent 0-100%)
- El stock no se descuenta automáticamente (pendiente implementar)

## Pagos
- Métodos disponibles: TARJETA, TRANSFERENCIA, CONTRA_ENTREGA
- No hay integración con pasarela de pagos (pendiente Wompi)
- PSE requiere integración con ACH Colombia — fuera del alcance actual

## Pendientes técnicos
- Descuento de stock al crear un pedido
- Integración con Wompi para pagos online
- Módulo de tracking de envíos
- Notificaciones por email al cambiar estado del pedido
