import { Metadata } from 'next/metadata';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Servicios - Admin Panel',
  robots: 'noindex, nofollow',
};

// Mock data - in production, fetch from Firebase
const services = [
  {
    id: '1',
    title: 'Experiencia de Buceo en Cenotes',
    description: 'Explora los cenotes más hermosos de la Riviera Maya con guías expertos certificados. Una aventura única en aguas cristalinas rodeada de formaciones rocosas milenarias.',
    image: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
    externalLink: 'https://example.com/buceo-cenotes',
    featured: true,
    createdAt: new Date('2024-12-01'),
  },
  {
    id: '2',
    title: 'Tour Gastronómico Maya',
    description: 'Descubre los sabores auténticos de la cocina maya en un recorrido por los mejores restaurantes y mercados locales.',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    externalLink: 'https://example.com/tour-gastronomico',
    featured: true,
    createdAt: new Date('2024-12-02'),
  },
  {
    id: '3',
    title: 'Excursión a Chichen Itzá VIP',
    description: 'Visita una de las maravillas del mundo moderno con acceso preferencial y guía especializado en cultura maya.',
    image: 'https://images.pexels.com/photos/161401/pyramids-chichen-itza-mexico-mayan-161401.jpeg',
    externalLink: 'https://example.com/chichen-itza-vip',
    featured: false,
    createdAt: new Date('2024-12-03'),
  },
  {
    id: '4',
    title: 'Spa y Wellness Maya',
    description: 'Experimenta tratamientos ancestrales mayas en un spa de lujo frente al mar.',
    image: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg',
    externalLink: 'https://example.com/spa-wellness',
    featured: false,
    createdAt: new Date('2024-12-04'),
  },
];

/**
* Renders the Admin Services page with options to manage and view service statistics and details.
* @example
* AdminServicesPage()
* Returns a JSX element layout displaying the admin services page.
* @returns {JSX.Element} A React component that provides an interface for managing admin services.
**/
export default function AdminServicesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
            <p className="text-gray-600">Gestiona los servicios y experiencias afiliadas</p>
          </div>
          <Button asChild>
            <Link href="/admin/services/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{services.length}</div>
              <p className="text-sm text-gray-600">Total Servicios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {services.filter(s => s.featured).length}
              </div>
              <p className="text-sm text-gray-600">Destacados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {services.filter(s => !s.featured).length}
              </div>
              <p className="text-sm text-gray-600">Regulares</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2">
                  {service.featured && (
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      Destacado
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{service.title}</CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {service.description}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <ExternalLink className="w-4 h-4" />
                  <a 
                    href={service.externalLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline truncate"
                  >
                    {service.externalLink}
                  </a>
                </div>
                
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/admin/services/${service.id}/edit`}>
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {services.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay servicios registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando tu primer servicio o experiencia afiliada.
              </p>
              <Button asChild>
                <Link href="/admin/services/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Servicio
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}