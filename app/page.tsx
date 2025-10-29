import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchForm from '@/components/ui/search-form';
import PropertyCard from '@/components/ui/property-card';
import ServiceCard from '@/components/ui/service-card';
// CORREGIDO: Nos aseguramos de que las funciones reales estén importadas
import { getFeaturedProperties } from '@/lib/firebase/properties';
import { getFeaturedServices } from '@/lib/firebase/services';

// CORREGIDO: Ya no necesitamos los datos mock, por lo que se pueden eliminar.
// const mockFeaturedProperties = [ ... ];
// const mockFeaturedServices = [ ... ];

/**
 * Renders the home page with featured properties, services, and promotional sections.
 * @example
 * HomePage()
 * <JSX.Element>
 * @param None
 * @returns {JSX.Element} The JSX layout of the home page, including hero, featured properties, services, and call-to-action sections.
 */
export default async function HomePage() {
  // CORREGIDO: Reemplazamos los datos mock por llamadas asíncronas a Firebase.
  const featuredProperties = await getFeaturedProperties();
  const featuredServices = await getFeaturedServices();

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative h-screen">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/1179156/pexels-photo-1179156.jpeg"
            alt="Vista panorámica de playa tropical"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Descubre Tu
              <span className="block bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Escape Perfecto
              </span>
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto text-gray-200">
              Propiedades vacacionales excepcionales en los destinos más hermosos. 
              Crea recuerdos que durarán toda la vida.
            </p>
          </div>

          {/* Search Form */}
          <SearchForm />

          {/* Stats */}
          {/* NOTA: Estos números (16, 500+, 4.9) siguen siendo estáticos. */}
          {/* Más adelante, podríamos hacer que "16" sea dinámico contando las propiedades. */}
          <div className="grid grid-cols-3 gap-8 mt-12 text-center">
            <div>
              <div className="text-3xl font-bold">16</div>
              <div className="text-sm text-gray-300">Propiedades Únicas</div>
            </div>
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-gray-300">huéspedes Felices</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.9</div>
              <div className="text-sm text-gray-300 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-current" />
                Calificación
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      {/* CORREGIDO: Ahora 'featuredProperties' viene de Firebase */}
      {featuredProperties.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Propiedades Destacadas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona entre nuestras propiedades más populares, cada una cuidadosamente 
              elegida para ofrecerte una experiencia inolvidable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
              <Link href="/properties">
                Ver Todas las Propiedades
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              ¿Por Qué Elegirnos?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Nos dedicamos a crear experiencias excepcionales que van más allá del alojamiento tradicional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Ubicaciones Premium</h3>
              <p className="text-gray-600">
                Propiedades estratégicamente ubicadas en los destinos más deseados, 
                con acceso privilegiado a las mejores atracciones.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Calidad Garantizada</h3>
              <p className="text-gray-600">
                Cada propiedad es cuidadosamente seleccionada e inspeccionada para 
                asegurar los más altos estándares de calidad y comodidad.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Servicio Personalizado</h3>
              <p className="text-gray-600">
                Nuestro equipo está disponible 24/7 para asegurar que tu experiencia 
                sea perfecta desde el momento de la reserva hasta tu partida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Services */}
      {/* CORREGIDO: Ahora 'featuredServices' viene de Firebase */}
      {featuredServices.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Experiencias Únicas
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Complementa tu estancia con experiencias locales auténticas y memorables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>

          <div className="text-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/services">
                Ver Todas las Experiencias
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-gray-900 to-black py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            ¿Listo Para Tu Próxima Aventura?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Descubre propiedades increíbles y comienza a planificar el viaje de tus sueños hoy mismo.
          </p>
          <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            <Link href="/properties">
              Explorar Propiedades
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}