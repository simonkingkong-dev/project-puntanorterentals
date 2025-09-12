import { Metadata } from 'next/metadata';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Wifi, Car, Utensils, Home, Waves, Shield } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';

export const metadata: Metadata = {
  title: 'Amenidades Globales - Admin Panel',
  robots: 'noindex, nofollow',
};

// Icon mapping
const iconMap: { [key: string]: any } = {
  'wifi': Wifi,
  'car': Car,
  'utensils': Utensils,
  'home': Home,
  'waves': Waves,
  'shield': Shield,
};

// Mock data - in production, fetch from Firebase
const globalAmenities = [
  {
    id: '1',
    title: 'WiFi de Alta Velocidad',
    description: 'Conexión a internet de fibra óptica en todas las áreas de la propiedad',
    icon: 'wifi',
    featured: true,
    order: 1,
    createdAt: new Date('2024-12-01'),
  },
  {
    id: '2',
    title: 'Estacionamiento Privado',
    description: 'Espacios de estacionamiento seguros y gratuitos para todos los huéspedes',
    icon: 'car',
    featured: true,
    order: 2,
    createdAt: new Date('2024-12-02'),
  },
  {
    id: '3',
    title: 'Cocina Completamente Equipada',
    description: 'Cocina moderna con todos los electrodomésticos y utensilios necesarios',
    icon: 'utensils',
    featured: true,
    order: 3,
    createdAt: new Date('2024-12-03'),
  },
  {
    id: '4',
    title: 'Aire Acondicionado',
    description: 'Sistema de climatización en todas las habitaciones para máximo confort',
    icon: 'home',
    featured: false,
    order: 4,
    createdAt: new Date('2024-12-04'),
  },
  {
    id: '5',
    title: 'Acceso a Piscina',
    description: 'Piscina compartida o privada según la propiedad seleccionada',
    icon: 'waves',
    featured: false,
    order: 5,
    createdAt: new Date('2024-12-05'),
  },
  {
    id: '6',
    title: 'Seguridad 24/7',
    description: 'Vigilancia y seguridad las 24 horas para tu tranquilidad',
    icon: 'shield',
    featured: false,
    order: 6,
    createdAt: new Date('2024-12-06'),
  },
];

/**
 * Renders the Admin Amenities Page component that allows management of global amenities.
 * @example
 * AdminAmenitiesPage()
 * <AdminLayout>...</AdminLayout>
 * @returns {JSX.Element} A component rendering the admin interface for managing amenities, including lists and actions for amenities.
 */
export default function AdminAmenitiesPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
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
        <Card>
          <CardHeader>
            <CardTitle>Lista de Amenidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalAmenities
                .sort((a, b) => a.order - b.order)
                .map((amenity) => {
                  const IconComponent = iconMap[amenity.icon] || Home;
                  
                  return (
                    <div key={amenity.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{amenity.title}</h3>
                            {amenity.featured && (
                              <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                                Destacada
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{amenity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Orden: {amenity.order}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/amenities/${amenity.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {globalAmenities.length === 0 && (
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