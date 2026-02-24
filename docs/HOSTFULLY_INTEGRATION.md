# Integración Hostfully – Auditoría, configuración y diseño de sincronización

## 1. Auditoría: qué se importa hoy

### Origen de datos
- **API:** Hostfully API v3.2 (cliente en `lib/hostfully/client.ts`).
- **Endpoints usados:**
  - `GET /properties?agencyUid=...` → lista de propiedades de la agencia.
  - `GET /property-calendar/{propertyUid}?startDate=...&endDate=...` → calendario por propiedad.

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
