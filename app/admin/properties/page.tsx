import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MapPin, Users, Building } from 'lucide-react';
import Image from 'next/image';
import { getProperties } from '@/lib/firebase/properties';
import { Property } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Propiedades - Admin Panel',
  robots: 'noindex, nofollow',
};

/**
 * Renders the admin properties page allowing management of properties within the system.
 */
export default async function AdminPropertiesPage() {
  
  const properties: Property[] = (await getProperties()) ?? [];

  return (
    // El <AdminLayout> se aplica automáticamente desde app/admin/layout.tsx
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
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={property.images[0] || 'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg'}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={property.images[0]?.includes('pexels')} 
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {property.featured && (
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      Destacado
                    </Badge>
                  )}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg line-clamp-1">{property.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{property.location}</span>
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
      ) : (
        // CORREGIDO: Estado vacío (con la etiqueta </p> correcta)
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Building className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay propiedades registradas
            </h3>
            <p className="text-gray-600 mb-4">
              Comienza agregando tu primera propiedad.
            </p> 
            <Button asChild>
              <Link href="/admin/properties/new">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Propiedad
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}