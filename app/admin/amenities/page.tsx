import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Edit, Home, Plus, Shield, Trash2, Utensils, Waves, Wifi } from 'lucide-react';
import AdminLayout from '@/app/admin/layout';
import { getGlobalAmenities } from '@/lib/firebase/content';
import { GlobalAmenity } from '@/lib/types';

// CORREGIDO: Ya no importamos 'handleDeleteAmenity' aquí
// CORREGIDO: Importamos el nuevo componente cliente
import DeleteAmenityButton from './delete-amenity-button'; 

export const metadata: Metadata = {
  title: 'Amenidades Globales - Admin Panel',
  robots: 'noindex, nofollow',
};

const iconMap: { [key: string]: any } = {
  'wifi': Wifi,
  'car': Car,
  'utensils': Utensils,
  'home': Home,
  'waves': Waves,
  'shield': Shield,
};

export default async function AdminAmenitiesPage() {
  const globalAmenities: GlobalAmenity[] = (await getGlobalAmenities()) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ... (Tu Header y Stats se quedan igual) ... */}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Amenidades Globales</h1>
            <p className="text-gray-600">Gestiona las amenidades que se muestran en el sitio</p>
          </div>
          <Button asChild>
            <Link href="/admin/amenities/new">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Amenidad
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{globalAmenities.length}</div>
              <p className="text-sm text-gray-600">Total Amenidades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {globalAmenities.filter(a => a.featured).length}
              </div>
              <p className="text-sm text-gray-600">Destacadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {globalAmenities.filter(a => !a.featured).length}
              </div>
              <p className="text-sm text-gray-600">Regulares</p>
            </CardContent>
          </Card>
        </div>


        {/* Amenities List */}
        {globalAmenities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalAmenities
              .sort((a, b) => a.order - b.order) 
              .map((amenity: GlobalAmenity) => {
                const Icon = iconMap[amenity.icon] || Shield;
                
                // CORREGIDO: Eliminamos la acción 'deleteActionWithId'
                
                return (
                  <Card key={amenity.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-4 w-4" />
                        {amenity.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 line-clamp-2">{amenity.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          {amenity.featured && (
                            <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                              Destacada
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/amenities/${amenity.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          
                          {/* --- CORRECCIÓN CLAVE --- */}
                          {/* Reemplazamos el <form> por el nuevo Client Component */}
                          <DeleteAmenityButton amenityId={amenity.id} />
                          {/* --- FIN DE LA CORRECCIÓN --- */}

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            }
          </div>
        ) : (
          // Estado Vacío (sin cambios)
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay amenidades registradas
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando las amenidades que ofrecen tus propiedades.
              </p>
              <Button asChild>
                <Link href="/admin/amenities/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Amenidad
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}