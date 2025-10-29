import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MapPin, Users } from 'lucide-react';
// ¡IMPORTACIÓN ELIMINADA! El layout se aplica automáticamente.
// import AdminLayout from '@/components/admin/layout'; 
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Propiedades - Admin Panel',
  robots: 'noindex, nofollow',
};

// Mock data - in production, fetch from Firebase
const properties = Array.from({ length: 16 }, (_, i) => ({
  id: `property-${i + 1}`,
  title: `Casa Alkimia ${i + 1}`,
  description: `Una propiedad excepcional que ofrece comodidad y lujo en un entorno único.`,
  location: ['Playa del Carmen', 'Tulum', 'Cancún', 'Cozumel'][i % 4] + ', Riviera Maya',
  maxGuests: 2 + (i % 6),
  amenities: ['WiFi', 'A/C', 'Piscina', 'Cocina', 'Estacionamiento'].slice(0, 3 + (i % 3)),
  images: [
    'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg',
  ],
  pricePerNight: 100 + (i * 25),
  featured: i < 3,
  status: i % 10 === 0 ? 'inactive' : 'active',
}));

/**
 * Renders the admin properties page allowing management of properties within the system.
 * NOTA: El Layout de administración (Sidebar y Header) se aplica automáticamente
* gracias a 'app/admin/layout.tsx'.
 */
export default function AdminPropertiesPage() {
  return (
    // ELIMINADO: <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Propiedades</h1>
          <p className="text-gray-600">Gestiona todas las propiedades del sistema</p>
        </div>
        <Button asChild>
          <Link href="/admin/properties/new">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Propiedad
          </Link>
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <Card key={property.id} className="overflow-hidden">
            <div className="relative h-48">
              <Image
                src={property.images[0]}
                alt={property.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
                unoptimized={property.images[0].includes('pexels')} // Optimizando las imágenes de mock
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {property.featured && (
                  <Badge className="bg-orange-500 hover:bg-orange-600">
                    Destacado
                  </Badge>
                )}
                <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                  {property.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{property.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{property.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{property.maxGuests} huéspedes</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-gray-900">
                  ${property.pricePerNight}
                </span>
                <span className="text-sm text-gray-500">por noche</span>
              </div>
              
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/admin/properties/${property.id}/edit`}>
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
    </div>
    // ELIMINADO: </AdminLayout>
  );
}
