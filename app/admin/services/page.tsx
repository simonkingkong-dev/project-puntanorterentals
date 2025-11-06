import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import AdminLayout from '@/app/admin/layout';
import Image from 'next/image';
import { getServices } from '@/lib/firebase/services';
import { Service } from '@/lib/types';
// CORREGIDO: Importamos el nuevo componente cliente
import DeleteServiceButton from './delete-service-button'; 

export const metadata: Metadata = {
  title: 'Servicios - Admin Panel',
  robots: 'noindex, nofollow',
};

export default async function AdminServicesPage() {
  const services: Service[] = (await getServices()) ?? [];
  const featuredServices = services.filter(service => service.featured);
  const regularServices = services.filter(service => !service.featured);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ... (Header y Stats se quedan igual) ... */}

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
                {featuredServices.length}
              </div>
              <p className="text-sm text-gray-600">Destacados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {regularServices.length}
              </div>
              <p className="text-sm text-gray-600">Regulares</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Grid */}
        {services.length > 0 ? (
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
                    
                    {/* --- CORRECCIÓN CLAVE --- */}
                    {/* Reemplazamos el <Button> por el nuevo Client Component */}
                    <DeleteServiceButton serviceId={service.id} />
                    {/* --- FIN DE LA CORRECCIÓN --- */}

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Estado Vacío
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