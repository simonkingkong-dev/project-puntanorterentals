import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { getAdminReservations } from '@/lib/firebase-admin-queries';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReservationRowActions from './reservation-row-actions';

export const dynamic = 'force-dynamic';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmada</Badge>;
    case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
    case 'cancelled': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

export default async function AdminReservationsPage() {
  const reservations = await getAdminReservations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600">Gestiona todas las reservas del sistema</p>
        </div>
      </div>

      {/* Stats Cards (Resumen rápido) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{reservations.filter(r => r.status === 'confirmed').length}</div>
            <p className="text-sm text-gray-600">Confirmadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              ${reservations.reduce((sum, r) => (r.status === 'confirmed' ? sum + r.totalAmount : sum), 0).toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">Ingresos Totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader><CardTitle>Lista de Reservas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">No hay reservaciones.</TableCell>
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
                        <div className="text-sm">
                          <p>{format(reservation.checkIn, 'dd/MM/yy', { locale: es })} - {format(reservation.checkOut, 'dd/MM/yy', { locale: es })}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${reservation.totalAmount}</TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell className="text-right">
                        <ReservationRowActions reservationId={reservation.id} status={reservation.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}