# Punta Norte Rentals - Aplicación Web de Alquiler de Propiedades Vacacionales

Una aplicación web full-stack moderna para gestión de propiedades vacacionales, construida con Next.js 16, Firebase, y Stripe. Diseño inspirado en Lonely Planet con funcionalidad robusta para reservas y pagos.

## 🚀 Características Principales

- **Gestión de Propiedades**: CRUD completo para 16 propiedades vacacionales
- **Sistema de Reservas**: Calendario interactivo con disponibilidad en tiempo real
- **Buscador Avanzado**: Filtros por fechas, huéspedes y ubicación
- **Pagos Seguros**: Integración completa con Stripe
- **SEO Optimizado**: Metadatos dinámicos y estructura optimizada
- **Responsive Design**: Experiencia perfecta en todos los dispositivos
- **Gestión de Servicios**: CMS para experiencias y servicios afiliados

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 16** con App Router
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes UI
- **Lucide React** para iconos

### Backend
- **Firebase Firestore** para base de datos
- **Firebase Auth** para autenticación
- **Firebase Storage** para imágenes
- **Stripe** para procesamiento de pagos

### Herramientas
- **TypeScript** para tipado estático
- **ESLint** para linting
- **Date-fns** para manejo de fechas

## 📁 Estructura del Proyecto

```
├── app/
│   ├── (public)/                # Rutas públicas (Header/Footer)
│   │   ├── page.tsx             # Inicio
│   │   ├── contact/ about/ help/ terms/ privacy/ cancellation/
│   │   ├── properties/          # Listado y detalle por slug
│   │   ├── services/            # Esqueleto (fuera del menú)
│   │   └── payment/             # Pago y éxito
│   ├── admin/                   # Panel de administración (login, propiedades, reservas, etc.)
│   ├── api/
│   │   ├── admin/               # login, logout
│   │   ├── reservations/        # [id], by-payment-intent/[id]
│   │   └── stripe/             # create-payment-intent, webhook
│   ├── layout.tsx, not-found.tsx, error.tsx
│   └── globals.css
├── components/
│   ├── layout/                  # header, footer
│   ├── admin/                   # sidebar, header, image-uploader
│   └── ui/                      # shadcn + property-card, search-form, reservation-form, etc.
├── lib/
│   ├── firebase/                # properties, reservations, services, content, storage
│   ├── firebase-admin.ts, firebase-admin-queries.ts
│   ├── auth/admin/              # credenciales y sesión admin
│   ├── mail.ts, stripe.ts, types.ts, utils/
│   └── firebase.ts              # Cliente Firebase (singleton)
```

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone [repository-url]
cd punta-norte-rentals
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia `.env.local.example` a `.env.local` y completa todas las variables (Firebase, Stripe, SMTP, Admin, Hostfully).

Variables clave:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: clave de la **Google Maps JavaScript API** usada por los mapas públicos.
  - En desarrollo: ponla en `.env.local`.
  - En producción (Firebase/App Hosting): crea el secreto correspondiente y mápalo a esta variable de entorno.

### 4. Configurar Firebase
1. Crear un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitar Firestore Database
3. Habilitar Authentication (Email/Password)
4. Habilitar Storage
5. Obtener las credenciales del proyecto

### 5. Configurar Stripe
1. Crear cuenta en [Stripe](https://stripe.com)
2. Obtener las claves de API (test mode)
3. Configurar webhook para eventos de pago

### 6. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🔥 Configuración de Firebase

### Estructura de la Base de Datos (Firestore)

#### Colección: `properties`
```javascript
{
  id: string,
  title: string,
  description: string,
  location: string,
  maxGuests: number,
  amenities: string[],
  images: string[],
  pricePerNight: number,
  availability: { [date: string]: boolean },
  slug: string,
  featured: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Colección: `reservations`
```javascript
{
  id: string,
  propertyId: string,
  guestName: string,
  guestEmail: string,
  guestPhone: string,
  checkIn: Timestamp,
  checkOut: Timestamp,
  guests: number,
  totalAmount: number,
  status: 'pending' | 'confirmed' | 'cancelled',
  stripePaymentId: string,
  createdAt: Timestamp
}
```

#### Colección: `services`
```javascript
{
  id: string,
  title: string,
  description: string,
  image: string,
  externalLink: string,
  featured: boolean,
  createdAt: Timestamp
}
```

### Reglas de Seguridad

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Properties: read for all, write for authenticated users
    match /properties/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Reservations: for create use request.resource.data (resource does not exist yet)
    match /reservations/{document} {
      allow create: if request.auth != null &&
        request.resource.data.guestEmail == request.auth.token.email;
      allow read, update, delete: if request.auth != null &&
        (resource.data.guestEmail == request.auth.token.email ||
         request.auth.token.admin == true);
    }
    
    // Services: read for all, write for admin
    match /services/{document} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## 💳 Integración con Stripe

### Configuración de Webhooks
Configura un **único** webhook en Stripe Dashboard apuntando a:
```
https://your-domain.com/api/stripe/webhook
```

Eventos a escuchar:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Flujo de Pagos
1. Usuario completa formulario de reserva
2. Se crea Payment Intent en Stripe
3. Usuario confirma pago
4. Webhook actualiza estado de reserva
5. Se bloquean fechas en calendario

## 🎨 Diseño y UI/UX

### Paleta de Colores
- **Primario**: Gradiente naranja-rojo (`from-orange-500 to-red-500`)
- **Secundario**: Teal (`teal-500`)
- **Fondo**: Gris claro (`gray-50`)
- **Texto**: Gris oscuro (`gray-900`)

### Tipografía
- **Fuente Principal**: Inter (Google Fonts)
- **Tamaños**: Sistema de escalas coherente
- **Pesos**: 400, 500, 600, 700

### Componentes Clave
- **SearchForm**: Buscador principal con filtros
- **PropertyCard**: Tarjeta de propiedad con hover effects
- **PropertyGallery**: Galería de imágenes con modal
- **AvailabilityCalendar**: Calendario interactivo
- **ReservationForm**: Formulario de reserva completo

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Adaptaciones Móviles
- Navegación colapsible
- Grillas responsivas
- Formularios adaptados
- Imágenes optimizadas

## 🔍 SEO y Performance

### SEO
- Metadatos dinámicos por página
- URLs semánticas (/properties/[slug])
- Open Graph tags
- Twitter Cards
- Structured data

### Performance
- Lazy loading de imágenes
- Code splitting automático
- Optimización de bundle
- Caching inteligente

## 🚀 Deployment

### Build y Export
```bash
npm run build
```

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Variables de Entorno en Producción
Asegúrate de configurar todas las variables de entorno en tu plataforma de hosting.

Para **Google Maps** se recomienda:

- Crear la API key en Google Cloud Console y **restringirla**:
  - Tipo de API: habilitar solo *Maps JavaScript API*.
  - Restricción de aplicación: **HTTP referrers** (dominios de tu web).
  - Restricción de API: solo los servicios que realmente uses.
- Configurar **cuotas y alertas**:
  - En la sección de *Quotas*, establece un límite diario razonable de cargas de mapa (por ejemplo 1,000–2,000 al día mientras el proyecto está en pruebas).
  - En *Billing > Budgets & alerts*, crea un presupuesto mensual bajo (por ejemplo 20–30 USD) con alertas al 50%, 80% y 100%.
- En esta app el componente `GoogleMap`:
  - Solo se inicializa en el cliente cuando existe `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
  - Carga el script de Maps **una sola vez** por sesión de navegación.

## 🧪 Testing

### Datos de Prueba Stripe
```
Tarjeta de prueba: 4242 4242 4242 4242
Vencimiento: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

## 📈 Funcionalidades Futuras

- [x] Panel de administración completo (propiedades, reservas, servicios, testimonios, amenidades, contenido, contacto)
- [ ] Sistema de reviews y calificaciones
- [ ] Chat en tiempo real con soporte
- [ ] Integración con calendarios externos
- [ ] Sistema de cupones y descuentos
- [ ] App móvil React Native
- [ ] Analytics avanzados

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico:
- Email: hola@puntanorterentals.com (o el configurado en el panel Admin > Contacto)
- Issues: [GitHub Issues](repository-url/issues)

---

**Punta Norte Rentals** - Creando experiencias vacacionales excepcionales 🏖️✨