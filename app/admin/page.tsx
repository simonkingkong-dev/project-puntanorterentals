// Archivo: app/admin/page.tsx

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Calendar, Users, DollarSign } from 'lucide-react';
import { isAdminAuthenticated } from '@/lib/auth/admin/admin';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

// CAMBIO IMPORTANTE: Importamos las nuevas funciones de admin
import { getAdminProperties, getAdminReservations } from '@/lib/firebase-admin-queries';

export const metadata: Metadata = {
  title: 'Dashboard - Admin Panel',
  robots: 'noindex, nofollow',
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmada</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendiente</Badge>;
    case 'cancelled':
       return <Badge className="bg-red-100 text-red-800 hover:bg-red-800">Cancelada</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default async function AdminDashboard() {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) {
    redirect('/admin/login');
  }

  // CAMBIO: Usamos las funciones de Admin para saltar reglas de seguridad
  const allProperties = await getAdminProperties();
  const allReservations = await getAdminReservations();

  // Calculamos las estadísticas
  const totalProperties = allProperties.length;
  const totalReservations = allReservations.length;
  
  const today = new Date();
  const activeReservations = allReservations.filter(
    r => r.status === 'confirmed' && r.checkIn <= today && r.checkOut >= today
  );
  const activeGuests = activeReservations.reduce((sum, r) => sum + r.guests, 0);

  const monthlyRevenue = allReservations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + r.totalAmount, 0);
  
  const recentReservations = allReservations.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
         <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general de tu negocio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Propiedades</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground">Propiedades activas</p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Totales</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReservations}</div>
            <p className="text-xs text-muted-foreground">(Histórico)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huéspedes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGuests}</div>
            <p className="text-xs text-muted-foreground">Actualmente hospedados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos (Confirmados)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">(Histórico)</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Reservas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentReservations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay reservaciones recientes.</p>
            ) : (
              recentReservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{reservation.guestName}</p>
                    <p className="text-sm text-gray-600">
                      ID Prop: ...{reservation.propertyId.slice(-6)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(reservation.checkIn, 'dd/MM/yy', { locale: es })} - {format(reservation.checkOut, 'dd/MM/yy', { locale: es })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${reservation.totalAmount}</p>
                    {getStatusBadge(reservation.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}