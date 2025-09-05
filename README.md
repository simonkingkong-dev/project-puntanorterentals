# Casa Alkimia - Aplicación Web de Alquiler de Propiedades Vacacionales

Una aplicación web full-stack moderna para gestión de propiedades vacacionales, construida con Next.js 14, Firebase, y Stripe. Diseño inspirado en Lonely Planet con funcionalidad robusta para reservas y pagos.

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
- **Next.js 14** con App Router
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
├── app/                          # App Router de Next.js
│   ├── api/                      # API Routes
│   │   └── stripe/              # Endpoints de Stripe
│   ├── properties/              # Páginas de propiedades
│   ├── services/                # Página de servicios
│   ├── payment/                 # Sistema de pagos
│   └── globals.css              # Estilos globales
├── components/                   # Componentes React
│   ├── layout/                  # Componentes de layout
│   └── ui/                      # Componentes UI reutilizables
├── lib/                         # Utilidades y configuraciones
│   ├── firebase/                # Funciones de Firebase
│   ├── utils/                   # Utilidades generales
│   └── types.ts                 # Tipos TypeScript
```

## 🔧 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone [repository-url]
cd casa-alkimia
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia `.env.local.example` a `.env.local` y completa las variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

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
    
    // Reservations: authenticated users can read/write their own
    match /reservations/{document} {
      allow read, write: if request.auth != null && 
        (request.auth.token.email == resource.data.guestEmail || 
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
Configura un webhook en Stripe Dashboard apuntando a:
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

## 🧪 Testing

### Datos de Prueba Stripe
```
Tarjeta de prueba: 4242 4242 4242 4242
Vencimiento: Cualquier fecha futura
CVC: Cualquier 3 dígitos
```

## 📈 Funcionalidades Futuras

- [ ] Panel de administración completo
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
- Email: dev@casaalkimia.com
- Issues: [GitHub Issues](repository-url/issues)

---

**Casa Alkimia** - Creando experiencias vacacionales excepcionales 🏖️✨