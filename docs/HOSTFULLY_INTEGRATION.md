# Integración Hostfully – Auditoría, configuración y diseño de sincronización

## 1. Auditoría: qué se importa hoy

### Origen de datos
- **API:** Hostfully API v3.2 (cliente en `lib/hostfully/client.ts`).
- **Endpoints usados:**
  - `GET /properties?agencyUid=...` → lista de propiedades de la agencia.
  - `GET /property-calendar/{propertyUid}?from=YYYY-MM-DD&to=YYYY-MM-DD` → calendario por propiedad.

### Campos que leemos de Hostfully (propiedades)
En `sync-hostfully/actions.ts` (`mapHostfullyToProperty` y helpers) se usan:
- **Identificación:** `uid`, `id`.
- **Nombre:** `name`, `title`, `publicName`, `listingName`, `listings`/`channels` (para nombre público por canal).
- **Ubicación:** `address` (address, address2, city, state, zipCode, countryCode) → `location`.
- **Capacidad y precios:** `availability.maxGuests`, `availability.baseGuests`, `maxGuests`; `pricing.dailyRate`, `pricing.rate`, `pricePerNight`.
- **Descripción:** `description`, `summary`.
- **Imágenes:** `pictureLink` (principal) y arrays `photos`, `media`, `mediaLinks`, `images`, `photoUrls`, `propertyPhotos`, `mediaItems`, `pictures` (buscando en cada ítem `url`, `link`, `src`, etc.).
- **Detalles:** `bedrooms`, `bathrooms`, `summary`, `interaction`, `neighborhood`, `latitude`/`lat`, `longitude`/`lng`/`lon`.
- **Reseñas:** `reviews[]` con `author`, `text`/`comment`, `rating`, `date`.
- **Amenidades:** `amenities[]` (strings).

### Campos que leemos del calendario (cron)
En `api/cron/sync-hostfully-availability/route.ts`:
- Por cada día: `date` (YYYY-MM-DD), `available`, y para precio `rate`, `price` o `dailyRate`.

### Qué se persiste en Firestore (Property)
- Todo lo mapeado arriba: `title`, `description`, `location`, `maxGuests`, `amenities`, `images`, `pricePerNight`, `slug`, `featured`, `hostfullyPropertyId`, `bedrooms`, `bathrooms`, `summary`, `interaction`, `neighborhood`, `latitude`, `longitude`, `reviews`.
- **Disponibilidad:** inicialmente `availability: {}` en el sync de propiedades; el **cron** rellena `availability` y `dailyRates` desde el calendario de Hostfully (24 meses hacia adelante).

### Dependencias de la UI
- **Firestore:** listado de propiedades, detalle por slug, disponibilidad en calendario, precios por noche (ya no mostrados en el calendario), reservas.
- **Hostfully directo:** solo desde servidor (sync manual en admin, cron de disponibilidad). La UI pública no llama a Hostfully.

### Posibles gaps
- **Disponibilidad incorrecta:** Si el cron no se ejecuta (no hay CRON_SECRET o no está programado), `availability` queda vacío y todas las fechas pueden mostrarse disponibles o no según fallback. Solución: programar el cron (p. ej. cada 5–15 min) y asegurar que las propiedades tengan `hostfullyPropertyId`.
- **Fotos:** Hostfully puede devolver estructuras distintas (ej. objetos con `url` anidado). El código ya prueba varias claves; si faltan fotos, revisar en Hostfully la forma real de la respuesta (listings/channels con media) y ajustar `extractImages` si hace falta.
- **Descripciones:** Si Hostfully usa otros nombres de campo, añadirlos en `mapHostfullyToProperty` (ej. `longDescription`, `houseRules`).
- **Zonas horarias:** El cron usa fechas en hora local del servidor para `startStr`/`endStr` y para iterar. Si Hostfully devuelve fechas en UTC, asegurar consistencia (por ejemplo normalizando a UTC o a la zona de la propiedad).

---

## 2. Configuración en Hostfully (dashboard)

- **API key:** Agency Settings → API key (producción: platform.hostfully.com; sandbox: sandbox.hostfully.com).
- **Agency UID:** Mismo lugar (para `listProperties` con `agencyUid`).
- **Producción:** Por defecto la API es sandbox; hay que pedir a Hostfully activar acceso a producción.
- **Por propiedad:** Completar nombre público / listing name si quieres que el sitio muestre ese nombre en lugar del interno; subir fotos y descripciones; configurar precios y reglas de estancia para que el calendario y los importes sean correctos.

---

## 3. Configuración en el backend (este sitio)

- **Variables de entorno:** `HOSTFULLY_API_KEY`, `HOSTFULLY_AGENCY_UID`; opcional `HOSTFULLY_BASE_URL` (si no se define se usa sandbox). Para el cron: `CRON_SECRET`.
- **Cron:** Llamar `POST /api/cron/sync-hostfully-availability` con header `Authorization: Bearer <CRON_SECRET>` con la frecuencia deseada (ej. cada 5–15 min) para mantener `availability` y `dailyRates` al día.

---

## 4. Diseño de sincronización (contrato)

- **Fuente de verdad:** Hostfully para: nombre público, descripción, fotos, capacidad, amenidades, reseñas, precios por noche (por fecha si el calendario los devuelve), disponibilidad por fecha.
- **Firestore:** Caché de todo lo anterior; la UI solo lee Firestore. Las reservas se crean y actualizan en Firestore (y Stripe); no se escriben reservas en Hostfully desde esta app.
- **Sync de propiedades (manual):** Admin → Sync Hostfully. Actualiza datos de cada propiedad y mantiene `hostfullyPropertyId`; no sobrescribe `availability` (eso lo hace el cron).
- **Sync de disponibilidad y precios (automático):** Cron que para cada propiedad con `hostfullyPropertyId` llama a `getPropertyCalendar` (24 meses), rellena `availability` y `dailyRates` y actualiza el documento en Firestore.
- **Verificación de disponibilidad al reservar:** Solo Firestore (`checkPropertyAvailability` lee `property.availability`); no se llama a Hostfully en el flujo de pago.

### Cambios de código recomendados (si algo falla)
- Si la disponibilidad no coincide: revisar timezone en el cron y en Hostfully; ampliar rango del cron si hace falta; asegurar que el calendario de Hostfully devuelva `available` y opcionalmente `rate`/`price`/`dailyRate` por día.
- Si faltan fotos o descripciones: inspeccionar la respuesta real de `GET /properties` (logs en sync) y ajustar `extractImages` y `mapHostfullyToProperty` con los nombres de campo correctos.
- Si los precios no cuadran: confirmar en la API de Hostfully qué campo contiene el precio por noche por fecha y mapearlo en el cron (ya se usa `d.rate ?? d.price ?? d.dailyRate`).

---

## 5. Widgets de reserva y calendario (Hostfully → sitio propio)

### Objetivo
Usar el **widget oficial** (script + `div` o iframe) en la página de propiedad para que disponibilidad, precios y checkout salgan **directamente de Hostfully** y reduzcan desfases respecto a un calendario que solo lee caché (Firestore).

### Código en este repo
- Selector de motor: `NEXT_PUBLIC_BOOKING_ENGINE` (`custom` | `hostfully`) — ver [`lib/booking-engine.ts`](../lib/booking-engine.ts).
- Config pública del embed: [`lib/hostfully-widget-config.ts`](../lib/hostfully-widget-config.ts).
- Componente: [`components/ui/hostfully-booking-embed.tsx`](../components/ui/hostfully-booking-embed.tsx).
- En página de propiedad: [`components/ui/property-body.tsx`](../components/ui/property-body.tsx) — si `hostfully` y hay `hostfullyPropertyId`, se muestra el widget y **no** se sincroniza el carrito desde fechas; el flujo Stripe/`create-from-draft` no se usa en esa vista.

### Variables de entorno (ver también `.env.local.example`)
| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_BOOKING_ENGINE` | `custom` (defecto) o `hostfully`. |
| `NEXT_PUBLIC_HOSTFULLY_AGENCY_UID` | Mismo valor que `HOSTFULLY_AGENCY_UID` (visible al cliente; solo identifica agencia en el widget). |
| `NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC` | URL del atributo `src` del `<script>` del snippet del panel Hostfully. |
| `NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL` | Opcional. Plantilla con `{propertyUid}` y `{agencyUid}` si el proveedor da URL de iframe en lugar de script. |
| `NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_*_ATTR` | Opcional. Nombres de atributos `data-*` del `div` si difieren del snippet por defecto en código. |
| `NEXT_PUBLIC_HOSTFULLY_WIDGET_ROOT_CLASS` | Opcional. Clase del contenedor que el script puede buscar. |

### Contrato del snippet
1. En Hostfully: **Publishing / Custom Branding** → artículos “Set up the Hostfully Booking Widget” / “Integrate Hostfully into your website”.
2. Copiar la URL del script → `NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC`.
3. Copiar los nombres exactos de los atributos `data-*` del `div` de ejemplo → ajustar `NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_AGENCY_ATTR` y `NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_PROPERTY_ATTR` si hace falta.
4. El UID de propiedad en el embed debe coincidir con `hostfullyPropertyId` en Firestore (sync admin).

### Estilo visual (límites)
- **En tu web:** contenedor (bordes, márgenes, `min-height`, responsive) alrededor del embed en `HostfullyBookingEmbed` y en `property-body`.
- **Dentro del widget:** colores, botones y tipografía típicamente desde el panel Hostfully (**Custom branding / Set up custom CSS**). No se puede clonar pixel-perfect el diseño React/shadcn del sitio sin hacks frágiles.

### Sincronización respecto al flujo `custom`
- Con **widget**, la fuente de verdad de reserva en esa vista es Hostfully; el cron de disponibilidad sigue siendo útil para **catálogo** (listados, SEO) pero no gobierna el checkout del widget.
- Con **`custom`**, la verificación al pagar sigue leyendo `property.availability` en Firestore (mantener cron si usas ese flujo).

### Checklist de lanzamiento (hostfully)
1. `NEXT_PUBLIC_BOOKING_ENGINE=hostfully` + script URL + `NEXT_PUBLIC_HOSTFULLY_AGENCY_UID`.
2. Sync de propiedades: todas las publicadas tienen `hostfullyPropertyId`.
3. Probar 2–3 propiedades: fechas, total, idioma, validación de huéspedes, flujo hasta confirmación en Hostfully.
4. Móvil y ancho estrecho.
5. Revisión 24–48h de errores en logs tras el cambio.
6. **Firebase App Hosting / Secret Manager:** añadir los `NEXT_PUBLIC_*` anteriores con disponibilidad **BUILD** y **RUNTIME** para que el cliente embebido reciba los valores.

### Cloudflare WAF (opcional, reduce probes PHP/WordPress)
Regla única de ejemplo (syntax según documentación Cloudflare):

`(http.request.uri.path contains ".php") or starts_with(http.request.uri.path, "/wp-") or starts_with(http.request.uri.path, "/wp-content") or starts_with(http.request.uri.path, "/wp-includes") or starts_with(http.request.uri.path, "/wp-admin") or http.request.uri.path eq "/xmlrpc.php" or starts_with(http.request.uri.path, "/cgi-bin")`

Acción: **Block**. El proxy de Next.js en [`proxy.ts`](../proxy.ts) también devuelve 404 temprano para muchos de estos paths.
