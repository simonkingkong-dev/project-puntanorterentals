# Listado de mejoras y errores – Punta Norte Rentals

**Fecha del análisis:** Actualizado tras revisión del código actual.

---

## Estado: correcciones ya aplicadas

Los siguientes puntos del análisis anterior ya están resueltos:

| # | Tema | Estado |
|---|------|--------|
| 1.1 | Validación monto Stripe ($0.50) | ✅ Corregido en create-payment-intent |
| 1.2 | Páginas 404 (about, contact, help, terms, privacy, cancellation) | ✅ Todas existen en app/(public) |
| 1.3 | Página servicios con lógica incompleta | ✅ Simplificada, sin console.log |
| 1.4 | not-found sin layout | ✅ Incluye Header y Footer manualmente |
| 2.1 | Logs de credenciales en admin | ✅ Eliminados |
| 2.2 | Debug en firebase-admin | ✅ Solo warning en dev si falta key |
| 3.1 | .env.local.example incompleto | ✅ Incluye FIREBASE_*, SMTP_*, ADMIN_*, etc. |
| 3.2 | Mail sin validación de env | ✅ getTransporter valida SMTP_* |
| 5.1 | Nombre propiedad en página de éxito | ✅ propertyTitle en APIs y success |
| 5.3 | Footer con datos hardcodeados | ✅ Usa getContactInfo de Firestore |
| 5.4 | Enlaces a 404 | ✅ Resuelto con 1.2 |
| 8.1 | Reglas Firestore reservations | ✅ Lectura restringida por guestEmail |
| 9.2 | Error boundary | ✅ Existe app/error.tsx |
| 10.2 | Doble inicialización Firebase | ✅ Solo lib/firebase.ts (no hay config.ts) |
| 11.1 | Carpeta api/webhooks vacía | ✅ Eliminada |
| 11.3 | package.json name genérico | ✅ "punta-norte-rentals" |
| ANALISIS 2.1 | Monto hardcodeado en pago | ✅ Obtiene de API /api/reservations/[id] |
| ANALISIS 2.2 | Fechas no bloqueadas al confirmar | ✅ updatePropertyAvailabilityAdmin en webhook |
| ANALISIS 2.5 | Stripe duplicado | ✅ Una sola instancia en lib/stripe.ts |
| ANALISIS 2.6 | Variables de entorno no documentadas | ✅ En .env.local.example |

---

## 1. Errores y bugs pendientes

### 1.1 ~~Typo en delete-testimonials-button~~ ✅ Corregido
- Cambiado "absolutely" → "absolutamente"

### 1.2 ~~Página de éxito: fallback de propertyTitle~~ ✅ Corregido
- Fallback cambiado a "Tu reserva" cuando no hay propertyTitle

---

## 2. Seguridad

### 2.1 ~~API by-email sin rate limiting~~ ✅ Corregido
- Añadido rate limiting: 5 peticiones por IP por minuto

### 2.2 Autenticación admin por env
- **Contexto**: Admin usa `ADMIN_USERNAME` y `ADMIN_PASSWORD` en variables de entorno.
- **Mejora**: Para producción, valorar Firebase Auth u otro IdP con roles. La cookie ya es `httpOnly`, `secure` y `sameSite`.

---

## 3. Código y tipos

### 3.1 ~~Uso de `any`~~ ✅ Corregido
- `image-uploader`: `FileRejection[]` de react-dropzone
- `reservations.ts`: tipo explícito para `updateData`
- `content/page.tsx`: `LucideIcon` para iconos

---

## 4. UX y contenido

### 4.1 Mezcla de idiomas (si aplica)
- **Archivo**: `app/(public)/page.tsx` y otros.
- **Estado**: Hero ya está en español ("Vive el lujo en Punta Norte"). Revisar si queda contenido en inglés en otras páginas.

### 4.2 ~~Error boundary sin layout público~~ ✅ Corregido
- Añadido Header y FooterStatic (componente cliente) al error boundary

---

## 5. Performance y buenas prácticas

### 5.1 Imagen del hero externa
- **Archivo**: `app/(public)/page.tsx`
- **Problema**: Imagen de Unsplash en el hero; depende de un servicio externo y puede variar o dejar de estar disponible.
- **Solución**: Descargar la imagen al proyecto o subirla a Firebase Storage y usarla desde ahí.

---

## 6. Logs y depuración

### 6.1 Console en producción
- **Archivos**:
  - `app/api/reservations/[id]/route.ts`: `console.error` al fallar
  - `app/api/reservations/by-email/route.ts`: `console.error`
  - `lib/mail.ts`: `console.log` solo en dev (ya condicionado)
- **Solución**: Los `console.error` en APIs son aceptables para errores; evitar logs informativos en producción o condicionarlos a `NODE_ENV === 'development'`.

---

## 7. Documentación

### 7.1 ~~README desactualizado~~ ✅ Corregido
- Actualizado a Next.js 16

---

## 8. Testing

### 8.1 Cobertura de tests
- **Estado**: Existen `__tests__` con Jest configurado; hay tests para `properties/actions` y `date` utils.
- **Mejora**: Aumentar cobertura para Server Actions críticas, APIs de reservas y flujo de pago.

---

## 9. Resumen por prioridad

| Prioridad | Cantidad | Temas |
|-----------|----------|-------|
| **Alta**  | 2        | Typo testimonials (1.1), rate limiting by-email (2.1) |
| **Media** | 4        | Fallback propertyTitle (1.2), tipos/any (3.1), error boundary layout (4.2), imagen hero (5.1) |
| **Baja**  | 4        | Auth admin (2.2), idioma (4.1), logs (6.1), README (7.1) |

---

## 10. Resumen ejecutivo

El proyecto está en buen estado. La mayoría de los puntos del análisis anterior están corregidos:

- Flujo de pago con monto dinámico y bloqueo de fechas
- Stripe unificado
- Páginas públicas completas
- Variables de entorno documentadas
- Footer dinámico
- Reglas de Firestore ajustadas

Pendientes principales:

1. Corregir el typo "absolutely" → "absolutamente"
2. Añadir rate limiting a la API by-email
3. Mejorar tipos (reducir `any`)
4. Añadir Header/Footer al error boundary
5. Localizar la imagen del hero
