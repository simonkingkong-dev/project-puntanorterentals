# Referencia de setup del proyecto

**Uso:** Actualiza este archivo antes de cada push cuando cambien dependencias, archivos o variables de entorno. Tras clonar el repo en otro equipo (o en un ordenador nuevo), pide a un agente (p. ej. Cursor) que compare el estado del repositorio con lo que indica este archivo para comprobar que nada falta y que la estructura coincide.

---

## 1. Requisitos del sistema y herramientas globales

- **Node.js:** 18.x o 20.x LTS (recomendado). El proyecto usa Next.js 16 y TypeScript 5.
- **npm:** viene con Node. Usar `npm ci` para instalar dependencias exactas del lockfile.
- **Firebase CLI** (opcional, para deploy y secrets): `npm install -g firebase-tools` y `firebase login`. Para conceder acceso a secretos del backend: `firebase apphosting:secrets:grantaccess <SECRET_NAME> --backend punta-norte-rentals`.
- **Git:** para clonar y push. Rama por defecto: `main`.

---

## 2. Dependencias del proyecto (package.json)

Instalar con:

```bash
npm ci
```

No se listan aquí las versiones exactas; están en `package.json` y `package-lock.json`. Las dependencias principales incluyen: next, react, react-dom, firebase, firebase-admin, stripe, @stripe/stripe-js, @stripe/react-stripe-js, @radix-ui/*, tailwindcss, lucide-react, date-fns, nodemailer, zod, react-hook-form, server-only, etc. Dev: eslint, eslint-config-next, jest, @testing-library/*, typescript.

Scripts relevantes:

- `npm run dev` — desarrollo (Next.js dev server).
- `npm run build` — build de producción.
- `npm run start` — servir build de producción.
- `npm run lint` — ESLint.
- `npm test` — Jest.
- `npm run audit-firestore` — script de auditoría Firestore.

---

## 3. Variables de entorno (.env.local)

El archivo `.env.local` no se sube al repo (está en `.gitignore`). Copia desde `.env.local.example` y rellena los valores. Las variables que debe contener (o estar en Secret Manager en producción) son:

**Firebase (cliente):**  
`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

**Firebase Admin (servidor):**  
`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

**Stripe:**  
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

**Email (SMTP):**  
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

**Admin dashboard:**  
`ADMIN_USERNAME`, `ADMIN_PASSWORD`

**Hostfully:**  
`HOSTFULLY_API_KEY`, `HOSTFULLY_AGENCY_UID`, `HOSTFULLY_BASE_URL` (opcional)

**Opcionales:**  
`CRON_SECRET` (para el cron de disponibilidad), `NEXT_PUBLIC_BASE_URL`, `USD_MXN_RATE`

---

## 4. Estructura de archivos y directorios que debe tener el repo

Rutas relativas a la raíz del proyecto. Excluye: `node_modules`, `.next`, `.env.local`, `.git`. Si al clonar falta o sobra algún archivo o carpeta respecto a esta lista, revisar antes de seguir.

```
.firebaserc
.bolt/config.json
.bolt/ignore
.bolt/prompt
.env.local.example
.eslintrc.json
.gitignore
apphosting.yaml
components.json
firebase.json
firestore.indexes.json
firestore.rules
jest.config.ts
jest.setup.ts
next.config.js
package.json
package-lock.json
postcss.config.js
proxy.ts
tailwind.config.ts
storage.rules
tsconfig.json
app/layout.tsx
app/globals.css
app/not-found.tsx
app/(public)/layout.tsx
app/(public)/page.tsx
app/(public)/about/page.tsx
app/(public)/cancellation/page.tsx
app/(public)/cart/page.tsx
app/(public)/contact/page.tsx
app/(public)/my-reservations/page.tsx
app/(public)/payment/page.tsx
app/(public)/payment/success/page.tsx
app/(public)/privacy/page.tsx
app/(public)/properties/page.tsx
app/(public)/properties/[slug]/page.tsx
app/(public)/reservations/[id]/modify/page.tsx
app/(public)/services/page.tsx
app/(public)/terms/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
app/admin/contact/page.tsx
app/admin/contact/contact-form.tsx
app/admin/contact/actions.ts
app/admin/content/page.tsx
app/admin/content/actions.ts
app/admin/settings/page.tsx
app/admin/amenities/page.tsx
app/admin/amenities/actions.ts
app/admin/amenities/delete-amenity-button.tsx
app/admin/amenities/new/page.tsx
app/admin/amenities/[id]/edit/page.tsx
app/admin/amenities/[id]/edit/edit-form.tsx
app/admin/modification-requests/page.tsx
app/admin/properties/page.tsx
app/admin/properties/actions.ts
app/admin/properties/delete-property-button.tsx
app/admin/properties/new/page.tsx
app/admin/properties/sync-hostfully/page.tsx
app/admin/properties/sync-hostfully/actions.ts
app/admin/properties/[id]/edit/page.tsx
app/admin/properties/[id]/edit/edit-form.tsx
app/admin/reservations/page.tsx
app/admin/reservations/actions.ts
app/admin/reservations/new/page.tsx
app/admin/reservations/new/new-form.tsx
app/admin/reservations/[id]/edit/page.tsx
app/admin/reservations/[id]/edit/edit-form.tsx
app/admin/reservations/reservation-row-actions.tsx
app/admin/services/page.tsx
app/admin/services/delete-service-button.tsx
app/admin/services/new/page.tsx
app/admin/services/[id]/edit/page.tsx
app/admin/services/[id]/edit/edit-form.tsx
app/admin/testimonials/page.tsx
app/admin/testimonials/delete-testimonials-button.tsx
app/admin/testimonials/new/page.tsx
app/admin/testimonials/[id]/edit/page.tsx
app/admin/testimonials/[id]/edit/edit-form.tsx
app/api/admin/login/route.ts
app/api/admin/logout/route.ts
app/api/admin/sync-hostfully/route.ts
app/api/cron/sync-hostfully-availability/route.ts
app/api/exchange-rate/route.ts
app/api/properties/by-slug/route.ts
app/api/reservations/by-email/route.ts
app/api/reservations/by-property-dates/route.ts
app/api/reservations/confirm-by-payment-intent/route.ts
app/api/reservations/create-from-draft/route.ts
app/api/reservations/by-payment-intent/[id]/route.ts
app/api/reservations/[id]/cancel-confirmed/route.ts
app/api/reservations/[id]/confirmation/route.ts
app/api/reservations/[id]/extend/route.ts
app/api/reservations/[id]/hold/route.ts
app/api/reservations/[id]/modify-details/route.ts
app/api/reservations/[id]/prepare-modification/route.ts
app/api/reservations/[id]/refund-difference/route.ts
app/api/reservations/[id]/release/route.ts
app/api/reservations/[id]/request-modification/route.ts
app/api/reservations/[id]/route.ts
app/api/reservations/[id]/status/route.ts
app/api/reservations/[id]/update-confirmed/route.ts
app/api/stripe/create-payment-intent/route.ts
app/api/stripe/webhook/route.ts
app/calendar-feed/route.ts
components/admin/header.tsx
components/admin/image-uploader.tsx
components/admin/sidebar.tsx
components/layout/footer.tsx
components/layout/footer-static.tsx
components/layout/header.tsx
components/property-page-content.tsx
components/search-form-client.tsx
components/ui/accordion.tsx
components/ui/alert-dialog.tsx
components/ui/alert.tsx
components/ui/aspect-ratio.tsx
components/ui/availability-calendar.tsx
components/ui/avatar.tsx
components/ui/badge.tsx
components/ui/breadcrumb.tsx
components/ui/button.tsx
components/ui/calendar.tsx
components/ui/card.tsx
components/ui/carousel.tsx
components/ui/chart.tsx
components/ui/checkbox.tsx
components/ui/collapsible.tsx
components/ui/command.tsx
components/ui/context-menu.tsx
components/ui/currency-select.tsx
components/ui/dialog.tsx
components/ui/drawer.tsx
components/ui/dropdown-menu.tsx
components/ui/form.tsx
components/ui/hover-card.tsx
components/ui/input-otp.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/menubar.tsx
components/ui/navigation-menu.tsx
components/ui/pagination.tsx
components/ui/popover.tsx
components/ui/progress.tsx
components/ui/property-body.tsx
components/ui/property-card.tsx
components/ui/property-gallery.tsx
components/ui/radio-group.tsx
components/ui/resizable.tsx
components/ui/reservation-form.tsx
components/ui/scroll-area.tsx
components/ui/select.tsx
components/ui/skeleton.tsx
components/ui/separator.tsx
components/ui/service-card.tsx
components/ui/sheet.tsx
components/ui/slider.tsx
components/ui/sonner.tsx
components/ui/search-form.tsx
components/ui/switch.tsx
components/ui/table.tsx
components/ui/tabs.tsx
components/ui/textarea.tsx
components/ui/toast.tsx
components/ui/toaster.tsx
components/ui/toggle-group.tsx
components/ui/toggle.tsx
components/ui/tooltip.tsx
hooks/use-toast.ts
lib/auth/admin/admin.ts
lib/country-codes.ts
lib/firebase-admin-queries.ts
lib/firebase-admin.ts
lib/firebase.ts
lib/firebase/content.ts
lib/firebase/properties.ts
lib/firebase/reservations.ts
lib/firebase/services.ts
lib/firebase/storage.ts
lib/hostfully/client.ts
lib/mail.ts
lib/stripe.ts
lib/types.ts
lib/utils.ts
lib/utils/date.ts
lib/cart-context.tsx
docs/EXPLICACION_CAMBIOS.md
docs/FIRESTORE_ECONNRESET.md
docs/IMAGEN_HERO.md
docs/PRUEBA_DE_PAGO.md
scripts/audit-firestore.mjs
__tests__/lib/utils/date.test.ts
.vscode/settings.json
```

---

## 5. Cómo usar esta referencia

- **Antes de cada push:** Si añadiste o eliminaste archivos, dependencias (package.json) o variables de entorno (.env.local.example / apphosting.yaml), actualiza las secciones correspondientes de este archivo.
- **Tras clonar el repo en otro equipo:** Ejecuta `npm ci`, crea `.env.local` desde `.env.local.example` y rellena valores. Luego pide a un agente: "Compara el repositorio clonado con SETUP_REFERENCE.md: comprueba que existan todos los archivos listados, que las dependencias de package.json coincidan con lo descrito y que las variables de .env.local sean las indicadas."

---

*Última actualización de la lista de archivos y dependencias: coincide con el estado del repo al guardar este archivo.*
