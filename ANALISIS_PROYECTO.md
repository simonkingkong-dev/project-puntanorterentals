# Análisis del Proyecto Punta Norte Rentals

Comparación entre lo definido en el README, el estado actual del código y las correcciones necesarias para terminar el proyecto.

---

## 1. Lo que está bien implementado

### 1.1 Estructura y stack
- **Next.js 14** con App Router, **TypeScript**, **Tailwind**, **shadcn/ui** y **Lucide** están en uso.
- **Firebase**: Firestore, Auth y Storage configurados (cliente y Admin SDK).
- **Stripe**: Integración con Payment Intents en el flujo principal.
- **Estructura de carpetas**: `app/(public)`, `app/admin`, `app/api`, `components`, `lib` coherentes con el README.

### 1.2 Funcionalidades que coinciden con el README
- **Gestión de propiedades**: CRUD en admin, listado y detalle por slug en público.
- **Buscador**: `SearchForm` en home con filtros.
- **Componentes clave**: `PropertyCard`, `PropertyGallery`, `AvailabilityCalendar`, `ReservationForm` existen y se usan.
- **Página de propiedades**: Listado, filtros y detalle con galería, descripción, amenidades y calendario.
- **Servicios**: Página pública y CMS en admin.
- **Panel de administración**: Login, propiedades, reservas, servicios, testimonios, amenidades, contenido, contacto, configuración (más de lo que el README listaba como “futuro”).
- **Tipos y Firestore**: `Property`, `Reservation`, `Service` alineados con el README; colecciones `properties`, `reservations`, `services` usadas correctamente en el flujo principal.
- **Flujo de reserva principal**: `ReservationForm` → Server Action `handleCreatePublicReservation` (Firebase Admin) → redirección a `/payment?reservation=ID` → Payment Intent → webhook `api/stripe/webhook` confirma reserva y envía email.

### 1.3 Seguridad y backend
- Server Action usa **Firebase Admin** para crear reservas (correcto).
- Webhook de Stripe en `api/stripe/webhook` usa **Admin SDK** para actualizar reservas y envía correo de confirmación.
- Reglas de Firestore definidas para `properties`, `services`, `reservations`, etc.

---

## 2. Errores y problemas críticos

### 2.1 Monto de pago hardcodeado en la página de pago
- **Dónde**: `app/(public)/payment/page.tsx` línea ~106.
- **Problema**: `const amount = 350` está fijo. El usuario puede pagar 350 USD aunque su reserva sea otro monto.
- **Solución**: Obtener el monto desde la reserva. Crear una API `GET /api/reservations/[id]` (solo para reservas `pending`) que devuelva `totalAmount` (y datos mínimos para mostrar). La página de pago debe usar `reservationId` de la URL, llamar a esa API y usar ese `totalAmount` para crear el Payment Intent.

### 2.2 Fechas no se bloquean al confirmar el pago
- **README**: “Se bloquean fechas en calendario” tras el pago.
- **Realidad**: El webhook `api/stripe/webhook` actualiza la reserva a `confirmed` pero **no** actualiza `property.availability`. Las fechas de la propiedad siguen apareciendo disponibles.
- **Solución**: En el webhook, cuando `payment_intent.succeeded`, además de actualizar la reserva:
  - Obtener `propertyId`, `checkIn`, `checkOut` de la reserva.
  - Llamar a una función (con Admin SDK) que actualice `properties/{id}.availability` marcando ese rango de fechas como no disponibles (por ejemplo `availability[date] = false`).

### 2.3 Dos flujos de pago distintos (duplicados y uno roto)
- **Flujo A (correcto)**: `ReservationForm` → Server Action → `reservations` → `/payment?reservation=ID` → Payment Intent → `api/stripe/webhook` → actualiza `reservations` y envía email.
- **Flujo B (obsoleto/roto)**:
  - `BookingForm` → `POST /api/checkout` → escribe en colección **`bookings`** (no `reservations`).
  - Usa **Firebase cliente** (`lib/firebase/config`) en una API Route (servidor). En servidor debe usarse Admin SDK.
  - Las reglas de Firestore **no** definen `bookings`; la escritura puede fallar o depender de reglas por defecto.
  - Redirige a Stripe Checkout Session y luego a **`/bookings/success`**, pero en el proyecto solo existe **`/payment/success`**.
  - El webhook `api/webhooks/stripe` escucha `checkout.session.completed` y actualiza `bookings` con el SDK cliente (inconsistente con el resto del backend).
- **Conclusión**: `BookingForm`, `api/checkout` y `api/webhooks/stripe` forman un flujo alternativo incompleto y confuso. Lo coherente con el README y el resto del código es **un solo flujo**: reservas en `reservations` + Payment Intent + un solo webhook (`api/stripe/webhook`).

**Recomendación**: 
- Eliminar o dejar de usar el flujo B: quitar (o no enlazar) `BookingForm`, deprecar `api/checkout` y `api/webhooks/stripe`, o unificarlos si en el futuro se quiere Checkout Session en lugar de Payment Intent (entonces que también escriban en `reservations` y usen Admin SDK).

### 2.4 Posible carrera en la página de éxito
- **Dónde**: `app/(public)/payment/success/page.tsx`.
- **Problema**: Stripe redirige al usuario a `/payment/success?payment_intent=...` de inmediato. El webhook puede ejecutarse un poco después. La página busca la reserva por `stripePaymentId`; si el webhook no ha actualizado aún, no hay reserva con ese `payment_intent` y se muestra “Reservación no encontrada”.
- **Solución**: 
  - Opción A: Reintentos con backoff en el cliente (polling) hasta que aparezca la reserva o timeout.
  - Opción B: Mostrar un estado “Procesando tu pago…” y recargar o hacer polling cada 2–3 s hasta que `getReservationByPaymentIntentId` devuelva datos.

### 2.5 Versión de API de Stripe duplicada e inconsistente
- **Dónde**: `lib/stripe.ts` usa `apiVersion: '2023-10-16'`; `app/api/stripe/webhook/route.ts` y `app/api/stripe/create-payment-intent/route.ts` crean otra instancia de Stripe con `apiVersion: '2025-08-27.basil'`.
- **Problema**: Dos versiones distintas y código duplicado; puede dar comportamientos o tipos distintos.
- **Solución**: Usar una sola instancia de Stripe desde `lib/stripe.ts` y una sola `apiVersion` en todo el proyecto (la que soporte Payment Intents que uses). Que el webhook y create-payment-intent importen `stripe` desde `@/lib/stripe`.

### 2.6 Variables de entorno no documentadas
- **README** menciona solo Firebase (público) y Stripe (publishable, secret, webhook).
- **Uso real**: 
  - Firebase Admin requiere `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` (y opcionalmente `NEXT_PUBLIC_BASE_URL`).
  - Email de confirmación en `lib/mail.ts` usa `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- **Solución**: Actualizar README y `.env.local.example` con todas las variables necesarias para desarrollo y producción.

---

## 3. Inconsistencias y mejoras

### 3.1 README vs realidad
- **README**: “Panel de administración completo” está en “Funcionalidades Futuras”. En el código el panel ya existe (admin con login, propiedades, reservas, etc.). Actualizar README para marcar el panel como implementado.
- **README**: Webhook en `https://your-domain.com/api/stripe/webhook`. En el código hay dos rutas: `api/stripe/webhook` (correcta para el flujo actual) y `api/webhooks/stripe` (flujo alternativo). Dejar documentada solo la que se use (por ejemplo `api/stripe/webhook`).
- **Estructura del proyecto en README**: No menciona `app/admin`, `app/(public)/payment`, ni `api/checkout` / `api/webhooks`. Conviene actualizar el árbol para reflejar la estructura real y el flujo de pago elegido.

### 3.2 Reglas de Firestore vs README
- **README**: “Reservations: authenticated users can read/write their own (guestEmail == auth.email or admin)”.
- **Código actual**: `match /reservations/{docId} { allow read, write: if request.auth != null; }` (cualquier usuario autenticado puede leer/escribir todas las reservas). No hay comprobación por `guestEmail`. Si se quiere que los huéspedes vean solo sus reservas, habría que añadir la condición (por ejemplo `resource.data.guestEmail == request.auth.token.email` para lectura de su propio documento). El panel admin suele usar Admin SDK (que ignora reglas), así que no cambia para el backend; solo afecta si en el futuro hay lectura de reservas desde el cliente con Firebase Auth.

### 3.3 Colección `bookings` y reglas
- Si se elimina el flujo de Checkout Session/bookings, no hace falta regla para `bookings`.
- Si se mantiene temporalmente, hay que definir reglas para `bookings` o aceptar que ese flujo no funcione hasta migrarlo a `reservations` y Admin SDK.

### 3.4 Duplicidad de configuración de Firebase
- Existen `lib/firebase.ts` y `lib/firebase/config.ts` con inicialización de Firebase cliente. Algunos archivos importan `db` desde `../firebase`, otros desde `../firebase/config`. No es un error funcional pero conviene unificar en un solo punto (por ejemplo `lib/firebase.ts` o `lib/firebase/config.ts`) y que todo el cliente use ese módulo.

### 3.5 Página de éxito: mostrar nombre de la propiedad
- En la página de éxito se muestra “Propiedad ID: ...{id}” porque `Reservation` no incluye el título de la propiedad. Se puede: añadir `propertyTitle` (o similar) al crear la reserva en la Server Action y guardarlo en el documento, o hacer un fetch de la propiedad por `propertyId` en la API de detalle de reserva para incluir el nombre en la respuesta.

### 3.6 Debug en producción
- **Dónde**: `lib/firebase-admin.ts` tiene `console.log("DEBUG ENV:", ...)` y `console.log("DEBUG PATH:", ...)`.
- **Solución**: Eliminar esos logs o envolverlos en `process.env.NODE_ENV === 'development'`.

---

## 4. Resumen de tareas para “terminar” el proyecto

| Prioridad | Tarea |
|----------|--------|
| Alta | Página de pago: obtener monto desde la reserva (API GET reserva por ID + usar totalAmount en create-payment-intent). |
| Alta | Webhook: al confirmar pago, actualizar disponibilidad de la propiedad (bloquear fechas checkIn–checkOut). |
| Alta | Unificar Stripe: una sola instancia en `lib/stripe.ts`, misma apiVersion; webhook y create-payment-intent usar esa instancia. |
| Media | Decidir flujo único: eliminar o no usar BookingForm + api/checkout + api/webhooks/stripe; documentar que el webhook oficial es api/stripe/webhook. |
| Media | Página de éxito: manejar race con webhook (polling o mensaje “Procesando…” y reintentos). |
| Media | README y .env.example: documentar FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, SMTP_*, NEXT_PUBLIC_BASE_URL; actualizar estructura y estado del admin. |
| Baja | Unificar imports de Firebase cliente en un solo módulo. |
| Baja | Mostrar nombre de la propiedad en la página de éxito (guardar en reserva o fetch en API). |
| Baja | Quitar console.log de debug en firebase-admin. |

---

## 5. Orden sugerido de implementación

1. **API GET reserva por ID** y uso del monto en la página de pago (y en create-payment-intent).
2. **Bloqueo de fechas** en el webhook al confirmar la reserva.
3. **Unificar Stripe** (lib/stripe.ts + eliminar instancias locales).
4. **Opcional**: Eliminar o marcar como obsoleto el flujo BookingForm/checkout/webhooks/stripe y actualizar README.
5. **Opcional**: Mejorar página de éxito (polling/UX) y nombre de propiedad; limpieza de debug y env.

Con estos pasos el proyecto queda alineado con el README, con un único flujo de reservas y pagos coherente y con disponibilidad actualizada tras cada confirmación.
