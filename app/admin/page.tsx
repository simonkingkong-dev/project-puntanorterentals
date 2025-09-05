import { Metadata } from 'next/metadata';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Calendar, Users, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';

export const metadata: Metadata = {
  title: 'Dashboard - Admin Panel',
  robots: 'noindex, nofollow',
};

// Mock data - in production, fetch from Firebase
const stats = {
  totalProperties: 16,
  totalReservations: 45,
  activeGuests: 12,
  monthlyRevenue: 15420,
};

const recentReservations = [
  {
    id: '1',
    guestName: 'María González',
    property: 'Casa Alkimia Suite Ocean View',
    checkIn: '2024-12-20',
    checkOut: '2024-12-23',
    status: 'confirmed',
    total: 450,
  },
  {
    id: '2',
    guestName: 'Carlos Rodríguez',
    property: 'Casa Alkimia Villa Tropical',
    checkIn: '2024-12-25',
    checkOut: '2024-12-28',
    status: 'pending',
    total: 840,
  },
  {
    id: '3',
    guestName: 'Ana Martínez',
    property: 'Casa Alkimia Penthouse',
    checkIn: '2024-12-30',
    checkOut: '2025-01-02',
    status: 'confirmed',
    total: 600,
  },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
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
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
              <p className="text-xs text-muted-foreground">Propiedades activas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reservas Totales</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReservations}</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Huéspedes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeGuests}</div>
              <p className="text-xs text-muted-foreground">Actualmente hospedados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+12% vs mes anterior</p>
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
              {recentReservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{reservation.guestName}</p>
                    <p className="text-sm text-gray-600">{reservation.property}</p>
                    <p className="text-xs text-gray-500">
                      {reservation.checkIn} - {reservation.checkOut}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${reservation.total}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      reservation.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {reservation.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}