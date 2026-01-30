# Listado completo: errores y mejoras del proyecto Punta Norte Rentals

Todo lo que está mal, es inconsistente o se puede mejorar (código, seguridad, UX, documentación, configuración).

---

## 1. Errores y bugs

### 1.1 Validación de monto en create-payment-intent
- **Archivo**: `app/api/stripe/create-payment-intent/route.ts`
- **Problema**: Se valida `amount < 50` (mínimo 50 dólares) pero el mensaje dice "al menos $0.50 USD". Inconsistente.
- **Solución**: Si el mínimo deseado es 50 centavos: validar `amount < 0.5` y mantener el mensaje. Si es 50 dólares: cambiar el mensaje a "al menos $50 USD". Stripe permite cobros desde $0.50, así que lo habitual es mínimo 0.5.

### 1.2 Páginas enlazadas que no existen (404)
- **Footer y home** enlazan a rutas sin página:
  - `/contact` → no existe `app/(public)/contact/page.tsx` (solo existe admin/contact).
  - `/about` → no existe.
  - `/help` → no existe.
  - `/terms` → no existe.
  - `/privacy` → no existe.
  - `/cancellation` → no existe.
- **Solución**: Crear esas páginas públicas o quitar/cambiar los enlaces (ej. Contacto → mailto o a una sección de contacto en home).

### 1.3 Página de servicios pública con lógica incompleta
- **Archivo**: `app/(public)/services/page.tsx`
- **Problema**: Usa `AvailabilityCalendar` y `ReservationForm` con una "property" que parece de ejemplo; hay `console.log('Selected dates:', dates)` y `console.log('Reservation completed')`. La página de servicios no debería ser un flujo de reserva de una propiedad concreta.
- **Solución**: Definir bien si la página de servicios es solo listado de servicios/experiencias (sin calendario de propiedad) o si debe permitir reservar algo; quitar los `console.log` y la lógica de reserva si no aplica.

### 1.4 Página 404 sin layout público
- **Archivo**: `app/not-found.tsx`
- **Problema**: La 404 está en la raíz y no usa el layout de `(public)`, por lo que no se muestra Header ni Footer.
- **Solución**: Mover `not-found.tsx` a `app/(public)/not-found.tsx` o envolver su contenido para que herede el layout público y se vea coherente con el resto del sitio.

---

## 2. Seguridad

### 2.1 Logs de credenciales en admin
- **Archivo**: `lib/auth/admin/admin.ts`
- **Problema**: `console.log('Credenciales ingresadas:', { username, password })` y `console.log('Credenciales esperadas:', ...)` exponen usuario y contraseña en logs (desarrollo y posiblemente producción).
- **Solución**: Eliminar esos logs por completo.

### 2.2 Debug en Firebase Admin
- **Archivo**: `lib/firebase-admin.ts`
- **Problema**: `console.log("DEBUG ENV:", ...)` y `console.log("DEBUG PATH:", ...)` se ejecutan al cargar el módulo; en producción pueden filtrar información.
- **Solución**: Eliminarlos o envolverlos en `if (process.env.NODE_ENV === 'development')`.

### 2.3 Autenticación admin por cookie y env
- **Contexto**: El admin usa cookie `admin-session` y credenciales en `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
- **Mejora**: Para producción, valorar Firebase Auth (o otro IdP) con roles en lugar de usuario/contraseña en env; y revisar que la cookie sea `httpOnly`, `secure` y `sameSite` (ya lo es en el código, pero conviene documentarlo).

---

## 3. Variables de entorno y configuración

### 3.1 .env.local.example incompleto
- **Archivo**: `.env.local.example`
- **Faltan**:
  - `FIREBASE_PRIVATE_KEY` y `FIREBASE_CLIENT_EMAIL` (requeridos por Firebase Admin).
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (para emails de confirmación).
  - `NEXT_PUBLIC_BASE_URL` (si se usa en algún redirect).
- **Solución**: Añadir todas las variables necesarias con valores de ejemplo (sin secretos reales) y comentarios breves.

### 3.2 Mail sin validación de env al arrancar
- **Archivo**: `lib/mail.ts`
- **Problema**: Se crea el transporter con `process.env.SMTP_*` sin comprobar que existan; el fallo aparece solo al enviar el primer email (ej. en el webhook).
- **Solución**: Validar SMTP_* al cargar el módulo (o en un init) y lanzar un error claro si faltan, igual que en firebase-admin.

---

## 4. Código y consistencia

### 4.1 Duplicidad de configuración Firebase (cliente)
- **Archivos**: `lib/firebase.ts` y `lib/firebase/config.ts`
- **Problema**: Dos puntos de inicialización del cliente Firebase; el código usa `../firebase` (lib/firebase.ts). `lib/firebase/config.ts` no se importa en el proyecto actual (solo en ANALISIS y export_all_code).
- **Solución**: Unificar en un solo módulo (p. ej. `lib/firebase.ts`) y eliminar o deprecar `lib/firebase/config.ts` para no tener dos fuentes de verdad.

### 4.2 Uso de `any` y type casts débiles
- **Lugares**:
  - `components/ui/reservation-form.tsx`: `} as any)` en `handleCreatePublicReservation`.
  - `app/api/stripe/webhook/route.ts`: `catch (err: any)`.
  - `components/ui/property-body.tsx`, `app/admin/amenities/page.tsx`, etc.: `{ [key: string]: any }` para iconos.
- **Solución**: Definir tipos correctos (p. ej. tipo para payload de la action, `unknown` en catch y luego type guard, tipo para mapa de iconos) y quitar `as any` donde sea posible.

### 4.3 ReservationForm: tipo del payload de la Server Action
- **Archivo**: `components/ui/reservation-form.tsx`
- **Problema**: Se hace cast `as any` al llamar a `handleCreatePublicReservation` para evitar conflictos de tipos.
- **Solución**: Definir en `app/(public)/properties/actions.ts` un tipo (ej. `CreateReservationInput`) y usarlo en la action y en el formulario para que no haga falta `as any`.

### 4.4 Reservations: import desde `../firebase` en entorno servidor
- **Archivo**: `lib/firebase/reservations.ts`
- **Problema**: Usa `db` del cliente Firebase (`../firebase`). La función `getReservationByPaymentIntentId` se usa desde la API route `app/api/reservations/by-payment-intent/[id]/route.ts`, que corre en servidor. En servidor es preferible usar Admin SDK para no depender de reglas de Firestore y evitar inicializar el cliente en Node.
- **Solución**: Para esa ruta (y cualquier lectura de reservas en API), usar Admin SDK (p. ej. una función en `lib/firebase-admin-queries.ts` que lea por `stripePaymentId`).

---

## 5. UX y contenido

### 5.1 Página de éxito: no se muestra nombre de la propiedad
- **Archivo**: `app/(public)/payment/success/page.tsx`
- **Problema**: Se muestra "Propiedad ID: ...{reservationData.propertyId.slice(-10)}" porque el tipo `Reservation` no incluye el título de la propiedad.
- **Solución**: Guardar `propertyTitle` (o similar) al crear la reserva en la Server Action y mostrarlo en la página de éxito; o hacer un fetch de la propiedad por `propertyId` en la API que devuelve la reserva y añadir el nombre en la respuesta.

### 5.2 Mezcla de idiomas (inglés / español)
- **Archivo**: `app/(public)/page.tsx` y otros.
- **Problema**: Hero en inglés ("Experience Luxury in Punta Norte", "Discover exquisite vacation rentals...") y resto en español ("Propiedades", "Experiencias", "Destacado", etc.).
- **Solución**: Decidir idioma principal (p. ej. español) y traducir todo el contenido público a ese idioma, o implementar i18n si se quiere multiidioma.

### 5.3 Footer: datos de contacto y redes fijos
- **Archivo**: `components/layout/footer.tsx`
- **Problema**: Teléfono, email, dirección y enlaces de redes están hardcodeados; las redes usan `href="#"`.
- **Solución**: Leer contacto (y redes) desde Firestore (`contactInfo`) o desde config/siteContent y enlazar las redes a URLs reales cuando existan.

### 5.4 Enlaces "Contact Us" / "Contacto" llevan a 404
- Ya cubierto en 1.2; impacta directamente en UX.

---

## 6. Logs y depuración

### 6.1 Console.log / console.warn en producción
- **Archivos**:
  - `lib/firebase-admin.ts`: DEBUG ENV/PATH (ya citado).
  - `lib/auth/admin/admin.ts`: credenciales (ya citado).
  - `app/api/stripe/webhook/route.ts`: "Procesando reserva...", "Reserva X confirmada...".
  - `lib/mail.ts`: "Email de confirmación enviado a...".
  - `lib/firebase/reservations.ts`: `console.warn` si no hay reserva por paymentIntentId.
  - `app/(public)/services/page.tsx`: "Selected dates", "Reservation completed".
  - `app/(public)/properties/page.tsx`: `console.error` al fallar fetch de propiedades.
  - `app/(public)/page.tsx`: `console.error` al fallar featured properties/services.
- **Solución**: Quitar logs de depuración y credenciales; dejar solo logs útiles para producción (errores o eventos críticos) y, si se mantienen informativos, condicionarlos a `NODE_ENV === 'development'` o a un nivel de log configurable.

---

## 7. Documentación

### 7.1 README desactualizado
- **Panel de administración**: Sigue en "Funcionalidades Futuras" aunque ya está implementado.
- **Estructura del proyecto**: No refleja `app/admin`, `app/(public)/payment`, `api/reservations`, etc.
- **Webhook**: Menciona solo `api/stripe/webhook`; correcto tras eliminar el otro, pero conviene aclarar que es el único endpoint de webhook de Stripe.
- **Variables de entorno**: No documenta FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, SMTP_*, ni NEXT_PUBLIC_BASE_URL si se usa.
- **Soporte**: Email "dev@casaalkimia.com" y nombre "casa-alkimia" en clonado; el proyecto es Punta Norte Rentals.
- **Solución**: Actualizar README: marcar admin como hecho, actualizar árbol de carpetas, webhook, env y datos de contacto/nombre del proyecto.

### 7.2 Comentarios obsoletos o poco útiles
- **Ejemplo**: `lib/auth/admin/admin.ts`: comentarios largos sobre NEXT_PUBLIC_ y "Las demás funciones permanecen sin cambios".
- **Solución**: Reducir comentarios a lo necesario y eliminar los que solo repiten lo que hace el código o ya no aplican.

---

## 8. Reglas de Firestore

### 8.1 Reservations: cualquier autenticado puede leer/escribir todas
- **Archivo**: `firestore.rules`
- **Problema**: `match /reservations/{docId} { allow read, write: if request.auth != null; }` permite a cualquier usuario autenticado leer y modificar cualquier reserva. Si en el futuro hubiera lectura de reservas desde el cliente (no admin), un usuario podría ver reservas de otros.
- **Solución**: Si solo el admin (vía Admin SDK) toca reservas, está bien; si algún día el cliente lee reservas por email, restringir: p. ej. `allow read: if request.auth != null && (resource.data.guestEmail == request.auth.token.email || request.auth.token.admin == true);`.

---

## 9. Testing y calidad

### 9.1 Sin tests
- **Problema**: No hay tests unitarios ni e2e; `package.json` no tiene scripts de test.
- **Solución**: Añadir Jest (o Vitest) y React Testing Library; al menos tests para lógica crítica (Server Actions, validaciones, helpers de fechas). Opcional: Playwright/Cypress para flujo de reserva y pago en test.

### 9.2 Sin error boundary global
- **Problema**: Si un componente lanza en el cliente, Next.js muestra su pantalla de error; no hay una página de error personalizada (error.tsx) por ruta o global.
- **Solución**: Añadir `app/error.tsx` (y opcionalmente `app/(public)/error.tsx`) con mensaje amigable y botón para volver, coherente con el diseño del sitio.

---

## 10. Performance y buenas prácticas

### 10.1 Imagen del hero externa
- **Archivo**: `app/(public)/page.tsx`
- **Problema**: Imagen de Unsplash en el hero; depende de un servicio externo y puede variar o dejar de estar disponible.
- **Solución**: Descargar la imagen al proyecto o subirla a Firebase Storage y usar esa URL en `next.config.js` remotePatterns; así se controla disponibilidad y caché.

### 10.2 Posible doble inicialización de Firebase cliente
- **Archivos**: `lib/firebase.ts` usa `getApps().length === 0`; `lib/firebase/config.ts` usa `!getApps().length`. Si en algún momento se importaran ambos, podría haber confusión. Hoy solo se usa uno.
- **Solución**: Al unificar en un solo módulo (ver 4.1), se evita por completo.

---

## 11. Limpieza y mantenimiento

### 11.1 Carpeta app/api/webhooks vacía
- **Problema**: Tras eliminar `api/webhooks/stripe/route.ts`, la carpeta `app/api/webhooks` (y posiblemente `webhooks/stripe`) queda vacía.
- **Solución**: Eliminar las carpetas vacías para no dejar rutas fantasma.

### 11.2 export_all_code.txt
- **Problema**: Archivo de exportación/copia de código que puede quedar desactualizado y no forma parte de la app.
- **Solución**: Si no se usa, eliminarlo o moverlo a un script/documentación y añadirlo a `.gitignore` si es generado.

### 11.3 package.json: name "nextjs"
- **Problema**: El nombre del proyecto en package.json es genérico ("nextjs").
- **Solución**: Cambiar a algo identificable, p. ej. `"punta-norte-rentals"` o el nombre que uses para el repo.

---

## 12. Resumen por prioridad

| Prioridad | Cantidad | Temas |
|-----------|----------|--------|
| **Alta**  | 5        | Validación monto Stripe (1.1), páginas 404 enlazadas (1.2), logs de credenciales (2.1), debug firebase-admin (2.2), README y .env.example (3.1, 7.1) |
| **Media** | 8        | Página servicios (1.3), not-found con layout (1.4), mail sin validación env (3.2), tipos/any (4.2–4.4), nombre propiedad en éxito (5.1), idioma (5.2), Firestore reservations (8.1), error boundary (9.2) |
| **Baja**  | 8        | Unificar Firebase cliente (4.1), footer dinámico (5.3), quitar resto de console (6.1), comentarios (7.2), tests (9.1), imagen hero (10.1), carpetas vacías y export_all (11.1–11.2), name en package.json (11.3) |

---

**Total aproximado**: más de 40 puntos entre errores, mejoras de seguridad, consistencia, UX y documentación. Se pueden atacar primero los de prioridad alta y luego los de media para dejar el proyecto estable y mantenible.
