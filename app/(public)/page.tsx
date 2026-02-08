import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchForm from '@/components/ui/search-form';
import PropertyCard from '@/components/ui/property-card';
import ServiceCard from '@/components/ui/service-card';
import { getFeaturedProperties } from '@/lib/firebase/properties';
import { getFeaturedServices } from '@/lib/firebase/services';
import { getSiteContentBySection } from '@/lib/firebase/content';

export const dynamic = 'force-dynamic'; // Asegura que se obtengan datos frescos en cada request

function contentMap(items: { key: string; value: string }[]) {
  return Object.fromEntries(items.map((i) => [i.key, i.value]));
}

/**
 * Renders the home page with featured properties, services, and promotional sections.
 */
export default async function HomePage() {
  // Ejecutamos las peticiones en paralelo para mejorar la velocidad de carga
  const [featuredProperties, featuredServices, homepageContent] = await Promise.all([
    getFeaturedProperties().catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error("[Home] Error fetching properties:", err);
      }
      return [];
    }),
    getFeaturedServices().catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error("[Home] Error fetching services:", err);
      }
      return [];
    }),
    getSiteContentBySection('homepage').catch(() => []),
  ]);

  const c = contentMap(homepageContent);
  const t = (key: string, fallback: string) => c[key]?.trim() || fallback;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop"
            alt="Punta Norte Hero"
            fill
            className="object-cover brightness-50"
            priority
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('hero_title', 'Vive el lujo en Punta Norte')}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            {t('hero_subtitle', 'Descubre propiedades vacacionales y servicios premium para tu estancia perfecta.')}
          </p>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg max-w-4xl mx-auto">
            <SearchForm />
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('featured_properties_title', 'Propiedades destacadas')}</h2>
              <p className="text-muted-foreground max-w-2xl">
                {t('featured_properties_subtitle', 'Explora nuestra selección de alojamientos premium, con las mejores amenidades y ubicaciones.')}
              </p>
            </div>
            <Link href="/properties">
              <Button variant="outline" className="hidden md:flex">
                Ver todas las propiedades <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
             <div className="text-center py-12 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">No hay propiedades destacadas en este momento.</p>
             </div>
          )}
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/properties">
              <Button variant="outline" className="w-full">
                Ver todas las propiedades <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('features_title', 'Premium Services')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('features_subtitle', 'Enhance your stay with our curated selection of concierge services and experiences.')}
            </p>
          </div>

          {featuredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Services currently being updated.</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust/Info Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Calidad premium</h3>
              <p className="text-primary-foreground/80">
                Cada propiedad es revisada en persona para garantizar el máximo confort y lujo.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Conserjería 24/7</h3>
              <p className="text-primary-foreground/80">
                Nuestro equipo está disponible en todo momento para ayudarte con lo que necesites.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary-foreground/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <MapPin className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Ubicaciones privilegiadas</h3>
              <p className="text-primary-foreground/80">
                En las zonas más deseadas, con vistas increíbles y fácil acceso a atracciones locales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t('cta_title', '¿Listo para una experiencia inolvidable?')}
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            {t('cta_subtitle', 'Reserva tu alojamiento soñado hoy o contáctanos para planear tu escapada perfecta.')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/properties">
              <Button size="lg" className="w-full sm:w-auto">
                Ver propiedades
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Contactar
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}