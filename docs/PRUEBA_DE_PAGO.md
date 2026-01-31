# Cómo hacer una reserva de prueba (pago con Stripe)

Para ver qué pasa después de poner datos bancarios en la pasarela de pago **sin cobrar de verdad**, usa el **modo prueba** de Stripe y sus tarjetas de test.

## 1. Usar claves de prueba de Stripe

En tu `.env.local` asegúrate de tener claves **de prueba** (no de producción):

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- `STRIPE_SECRET_KEY=sk_test_...`

Si usas `pk_live_` o `sk_live_`, los pagos serían reales. Para pruebas, solo usa `pk_test_` y `sk_test_`.

## 2. Hacer la reserva en la app

1. Entra en una propiedad (por ejemplo `/properties/[slug]`).
2. Elige **check-in** y **check-out** en el calendario.
3. Rellena el formulario (nombre, email, teléfono, huéspedes) y pulsa **Continuar al Pago**.
4. Serás redirigido a `/payment?reservation=...` con el formulario de pago de Stripe.

## 3. Usar una tarjeta de prueba de Stripe

En el formulario de pago (Stripe Payment Element) introduce:

| Dato        | Valor de prueba        |
|------------|-------------------------|
| Número     | `4242 4242 4242 4242`   |
| Fecha      | Cualquier fecha futura (ej. 12/34) |
| CVC        | Cualquier 3 dígitos (ej. 123)     |
| Nombre     | Cualquiera              |
| Código ZIP | Cualquiera (si lo pide) |

Con esa tarjeta el pago **siempre se considera exitoso** en modo test.

Pulsa **Confirmar Pago**. Stripe te redirige a la página de éxito.

## 4. Qué verás después del pago

- Redirección a **`/payment/success`** con un mensaje tipo **“¡Pago Exitoso!”**.
- Detalles de la reserva: propiedad, check-in, check-out, huéspedes, total pagado, ID de reserva y email de confirmación.

Si la página de éxito tarda en mostrar los datos, es porque el **webhook** de Stripe puede tardar unos segundos en confirmar la reserva en tu base de datos; la página hace un pequeño reintento automático.

### Si ves “La confirmación está tardando más de lo habitual” o “Pago recibido”

En **desarrollo local**, Stripe no puede llamar a tu `localhost`, así que el webhook **no se ejecuta** y la reserva no se marca como confirmada. Aun así:

- La página de éxito incluye el **ID de reserva** en la URL. Si el pago fue correcto, tras unos segundos se intenta cargar la reserva por ese ID y verás **“Pago recibido”** con los detalles de tu reserva y el aviso de que la confirmación puede llegar por correo.
- Para que la confirmación sea **inmediata** en local, usa el **Stripe CLI** (ver siguiente sección).

## 5. Probar el webhook en local (Stripe CLI)

Para que el webhook se ejecute en tu máquina y la reserva pase a “confirmada” al instante:

1. Instala [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Inicia el reenvío de webhooks a tu app:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. La CLI mostrará un **webhook signing secret** que empieza por `whsec_...`. Cópialo.
4. En `.env.local` pon ese valor en **`STRIPE_WEBHOOK_SECRET`** (sustituye el que tengas).
5. Reinicia el servidor de Next.js (`npm run dev`).
6. Haz de nuevo una reserva de prueba y paga. El webhook llegará a tu app y verás **“¡Pago Exitoso!”** con la reserva confirmada.

En producción (Vercel, etc.) configuras el webhook en el [Dashboard de Stripe](https://dashboard.stripe.com/webhooks) apuntando a tu URL real; no hace falta Stripe CLI.

## Otras tarjetas de prueba (Stripe)

- **4242 4242 4242 4242** – Pago correcto (la que conviene para tu prueba).
- **4000 0000 0000 0002** – Tarjeta rechazada (para probar errores).
- **4000 0025 0000 3155** – Requiere autenticación 3D Secure.

Más: [Stripe – Tarjetas de prueba](https://docs.stripe.com/testing#cards).
