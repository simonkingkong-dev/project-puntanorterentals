import { Metadata } from 'next/metadata';
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
import { Search, Edit, Trash2, Eye, Filter } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';

export const metadata: Metadata = {
  title: 'Reservas - Admin Panel',
  robots: 'noindex, nofollow',
};

// Mock data - in production, fetch from Firebase
const reservations = [
  {
    id: 'RES-001',
    guestName: 'María González',
    guestEmail: 'maria@example.com',
    guestPhone: '+52 984 123 4567',
    propertyTitle: 'Casa Alkimia Suite Ocean View',
    checkIn: '2024-12-20',
    checkOut: '2024-12-23',
    guests: 2,
    totalAmount: 450,
    status: 'confirmed',
    stripePaymentId: 'pi_1234567890',
    createdAt: '2024-12-15',
  },
  {
    id: 'RES-002',
    guestName: 'Carlos Rodríguez',
    guestEmail: 'carlos@example.com',
    guestPhone: '+52 984 987 6543',
    propertyTitle: 'Casa Alkimia Villa Tropical',
    checkIn: '2024-12-25',
    checkOut: '2024-12-28',
    guests: 4,
    totalAmount: 840,
    status: 'pending',
    stripePaymentId: null,
    createdAt: '2024-12-16',
  },
  {
    id: 'RES-003',
    guestName: 'Ana Martínez',
    guestEmail: 'ana@example.com',
    guestPhone: '+52 984 555 1234',
    propertyTitle: 'Casa Alkimia Penthouse',
    checkIn: '2024-12-30',
    checkOut: '2025-01-02',
    guests: 3,
    totalAmount: 600,
    status: 'confirmed',
    stripePaymentId: 'pi_0987654321',
    createdAt: '2024-12-17',
  },
  {
    id: 'RES-004',
    guestName: 'Luis Hernández',
    guestEmail: 'luis@example.com',
    guestPhone: '+52 984 777 8888',
    propertyTitle: 'Casa Alkimia Suite Ocean View',
    checkIn: '2024-12-18',
    checkOut: '2024-12-20',
    guests: 2,
    totalAmount: 300,
    status: 'cancelled',
    stripePaymentId: null,
    createdAt: '2024-12-10',
  },
];

/**
 * Renders a status badge based on the reservation status string.
 * @example
 * status("confirmed")
 * <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmada</Badge>
 * @param {string} status - The status of the reservation, can be 'confirmed', 'pending', 'cancelled', or any other string.
 * @returns {JSX.Element} A JSX element representing the styled badge for the given status.
 */
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

/**
 * AdminReservationsPage renders the admin interface to manage reservations.
 * @example
 * AdminReservationsPage()
 * <AdminLayout>...</AdminLayout>
 * @param None
 * @returns {JSX.Element} A React component rendering the reservations management page.
 */
export default function AdminReservationsPage() {
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

        {/* Stats Cards */}
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
                ${reservations.reduce((sum, r) => r.status === 'confirmed' ? sum + r.totalAmount : sum, 0).toLocaleString()}
              </div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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

        {/* Reservations Table */}
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
                    <TableHead>Propiedad</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Huéspedes</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">{reservation.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.guestName}</p>
                          <p className="text-sm text-gray-600">{reservation.guestEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{reservation.propertyTitle}</p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Check-in: {reservation.checkIn}</p>
                          <p>Check-out: {reservation.checkOut}</p>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.guests}</TableCell>
                      <TableCell className="font-medium">${reservation.totalAmount}</TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}