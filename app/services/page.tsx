import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServiceCard from '@/components/ui/service-card';
import { getServices } from '@/lib/firebase/services';

export const metadata: Metadata = {
  title: 'Experiencias y Servicios',
  description: 'Descubre experiencias únicas y servicios exclusivos para complementar tu estancia perfecta.',
  openGraph: {
    title: 'Experiencias y Servicios | Casa Alkimia',
    description: 'Descubre experiencias únicas y servicios exclusivos para complementar tu estancia perfecta.',
  },
};

// Mock data for development
const mockServices = [
  {
    id: '1',
    title: 'Experiencia de Buceo en Cenotes',
    description: 'Explora los cenotes más hermosos de la Riviera Maya con guías expertos certificados. Una aventura única en aguas cristalinas rodeada de formaciones rocosas milenarias. Incluye equipo completo de buceo, transporte y almuerzo típico mexicano.',
    image: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
    externalLink: 'https://example.com/buceo-cenotes',
    featured: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Tour Gastronómico Maya',
    description: 'Descubre los sabores auténticos de la cocina maya en un recorrido por los mejores restaurantes y mercados locales. Incluye degustaciones, historia culinaria y clase de cocina práctica con un chef experto en tradiciones mayas.',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    externalLink: 'https://example.com/tour-gastronomico',
    featured: true,
    createdAt: new Date(),
  },
  {
    id: '3',
    title: 'Excursión a Chichen Itzá VIP',
    description: 'Visita una de las maravillas del mundo moderno con acceso preferencial y guía especializado en cultura maya. Tour privado que incluye transporte de lujo, almuerzo gourmet y tiempo exclusivo para fotografías sin multitudes.',
    image: 'https://images.pexels.com/photos/161401/pyramids-chichen-itza-mexico-mayan-161401.jpeg',
    externalLink: 'https://example.com/chichen-itza-vip',
    featured: false,
    createdAt: new Date(),
  },
  {
    id: '4',
    title: 'Spa y Wellness Maya',
    description: 'Experimenta tratamientos ancestrales mayas en un spa de lujo frente al mar. Masajes con técnicas tradicionales, temazcal ceremonial y terapias con ingredientes naturales de la región como cacao, miel y jade.',
    image: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg',
    externalLink: 'https://example.com/spa-wellness',
    featured: false,
    createdAt: new Date(),
  },
  {
    id: '5',
    title: 'Aventura en Sian Ka\'an',
    description: 'Explora la reserva de la biosfera de Sian Ka\'an, Patrimonio de la Humanidad por la UNESCO. Incluye navegación por canales naturales, observación de fauna silvestre, snorkel en arrecifes vírgenes y almuerzo en una comunidad local.',
    image: 'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg',
    externalLink: 'https://example.com/sian-kaan',
    featured: false,
    createdAt: new Date(),
  },
  {
    id: '6',
    title: 'Pesca Deportiva en el Caribe',
    description: 'Vive la emoción de la pesca deportiva en las aguas del Mar Caribe. Embarcación equipada con última tecnología, capitán experimentado y oportunidad de pescar mahi-mahi, pez vela y marlin. Incluye equipo completo y bebidas.',
    image: 'https://images.pexels.com/photos/1123982/pexels-photo-1123982.jpeg',
    externalLink: 'https://example.com/pesca-deportiva',
    featured: false,
    createdAt: new Date(),
  },
];

export default async function ServicesPage() {
  // In production, fetch from Firebase
  const services = mockServices;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Inicio
            </Link>
          </Button>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Experiencias Únicas
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Complementa tu estancia con experiencias locales auténticas y memorables. 
              Cada actividad está cuidadosamente seleccionada para ofrecerte lo mejor de la cultura y naturaleza local.
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {services.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Próximamente
            </h3>
            <p className="text-gray-600">
              Estamos preparando experiencias increíbles para ti. ¡Vuelve pronto!
            </p>
          </div>
        ) : (
          <>
            {/* Featured Services */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Experiencias Destacadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {services.filter(service => service.featured).map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            </div>

            {/* All Services */}
            {services.filter(service => !service.featured).length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Más Experiencias</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {services.filter(service => !service.featured).map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Necesitas Ayuda Personalizando Tu Experiencia?
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            Nuestro equipo de concierge está listo para ayudarte a crear el itinerario perfecto 
            adaptado a tus intereses y preferencias.
          </p>
          <Button asChild size="lg" className="bg-white text-teal-600 hover:bg-gray-100">
            <Link href="/contact">
              Contactar Concierge
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}