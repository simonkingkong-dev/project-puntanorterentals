// Archivo: app/admin/reservations/page.tsx (Completo y Corregido)

import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Edit, Trash2, Eye, Filter, Calendar } from 'lucide-react';
import AdminLayout from '@/app/admin/layout';
import { getReservations } from '@/lib/firebase/reservations'; // <-- CORREGIDO: Importar función real
import { Reservation } from '@/lib/types'; // <-- CORREGIDO: Importar tipo
import { format } from 'date-fns'; // <-- Para formatear fechas
import { es } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Reservas - Admin Panel',
  robots: 'noindex, nofollow',
};

// CORREGIDO: Eliminamos los datos mock 

// Función helper para los badges (sin cambios)
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmada</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
    case 'cancelled':
       return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// CORREGIDO: La página ahora es 'async'
export default async function AdminReservationsPage() {
  
  // CORREGIDO: Obtenemos las reservaciones reales de Firebase
  const reservations: Reservation[] = (await getReservations()) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
         <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
            <p className="text-gray-600">Gestiona todas las reservas del sistema</p>
          </div>
        </div>

        {/* Stats Cards (Ahora son dinámicas) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {reservations.filter(r => r.status === 'confirmed').length}
               </div>
              <p className="text-sm text-gray-600">Confirmadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
               <div className="text-2xl font-bold text-yellow-600">
                {reservations.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-sm text-gray-600">Pendientes</p>
            </CardContent>
           </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {reservations.filter(r => r.status === 'cancelled').length}
               </div>
              <p className="text-sm text-gray-600">Canceladas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                ${reservations.reduce((sum, r) => (r.status === 'confirmed' ? sum + r.totalAmount : sum), 0).toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Ingresos (Confirmados)</p>
            </CardContent>
           </Card>
        </div>

        {/* Filters (sin cambios, aún no funcional) */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                 <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por nombre, email o ID de reserva..."
                    className="pl-10"
                  />
                </div>
              </div>
               <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
           </CardContent>
        </Card>

        {/* Reservations Table (Ahora es dinámica) */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Reservas</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>ID</TableHead>
                    <TableHead>Huésped</TableHead>
                    <TableHead>Propiedad (ID)</TableHead>
                    <TableHead>Fechas</TableHead>
                     <TableHead>Huéspedes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {/* CORREGIDO: Mapeamos las reservaciones reales */}
                  {reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No hay reservaciones encontradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                         <TableCell className="font-medium text-xs">...{reservation.id.slice(-6)}</TableCell>
                        <TableCell>
                          <div>
                             <p className="font-medium">{reservation.guestName}</p>
                            <p className="text-sm text-gray-600">{reservation.guestEmail}</p>
                          </div>
                         </TableCell>
                        <TableCell>
                          {/* NOTA: Mostramos el ID. Más adelante podríamos hacer un 'get' para mostrar el título. */}
                          <p className="font-medium text-xs">...{reservation.propertyId.slice(-6)}</p>
                         </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>Entrada: {format(reservation.checkIn, 'dd/MM/yy', { locale: es })}</p>
                            <p>Salida: {format(reservation.checkOut, 'dd/MM/yy', { locale: es })}</p>
                          </div>
                        </TableCell>
                         <TableCell>{reservation.guests}</TableCell>
                        <TableCell className="font-medium">${reservation.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                         <TableCell>
                          <div className="flex gap-2">
                            {/* Los botones de Editar y Borrar aún no están conectados */}
                            <Button variant="outline" size="sm">
                               <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                               <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                         </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
               </Table>
            </div>
          </CardContent>
        </Card>

        {/* Estado Vacío (Manejado dentro de la tabla) */}
        {reservations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No se han encontrado reservaciones
              </h3>
              <p className="text-gray-600 mb-4">
                Cuando los clientes comiencen a reservar, sus reservaciones aparecerán aquí.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}