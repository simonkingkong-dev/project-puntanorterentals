import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getAdminModificationRequests,
  getAdminRefundRequests,
  type ModificationRequestRow,
  type RefundRequestRow,
} from '@/lib/firebase-admin-queries';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function ModificationRequestsPage() {
  const [modificationRequests, refundRequests] = await Promise.all([
    getAdminModificationRequests(),
    getAdminRefundRequests(),
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Aprobado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800">Procesado</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Fallido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Solicitudes y reembolsos</h1>
        <p className="text-gray-600 mt-1">
          Solicitudes de modificación (después de 2h) y reembolsos realizados (cancelación dentro de 2h).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de modificación</CardTitle>
          <p className="text-sm text-gray-500">
            Casos creados cuando el huésped solicita modificación después de las 2 horas de confirmación.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Reserva</TableHead>
                  <TableHead>Solicitado por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nuevas fechas / huéspedes</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modificationRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No hay solicitudes de modificación.
                    </TableCell>
                  </TableRow>
                ) : (
                  modificationRequests.map((row: ModificationRequestRow) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">...{row.id.slice(-8)}</TableCell>
                      <TableCell className="font-mono text-xs">...{row.reservationId.slice(-8)}</TableCell>
                      <TableCell>{row.requestedBy}</TableCell>
                      <TableCell className="text-sm">
                        {format(row.requestedAt, 'dd/MM/yy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.newCheckIn && row.newCheckOut
                          ? `${format(new Date(row.newCheckIn), 'dd/MM', { locale: es })} - ${format(new Date(row.newCheckOut), 'dd/MM', { locale: es })}`
                          : '—'}
                        {row.newGuests != null && ` · ${row.newGuests} huéspedes`}
                      </TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reembolsos</CardTitle>
          <p className="text-sm text-gray-500">
            Cancelaciones dentro de 2h: quién solicitó, monto reembolsado, ID de Stripe y estado.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Reserva</TableHead>
                  <TableHead>Solicitado por</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Stripe Refund ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                      No hay reembolsos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  refundRequests.map((row: RefundRequestRow) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">...{row.id.slice(-8)}</TableCell>
                      <TableCell className="font-mono text-xs">...{row.reservationId.slice(-8)}</TableCell>
                      <TableCell>{row.requestedBy}</TableCell>
                      <TableCell className="font-medium">${row.amountRefunded}</TableCell>
                      <TableCell className="font-mono text-xs">{row.stripeRefundId ?? '—'}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(row.requestedAt, 'dd/MM/yy HH:mm', { locale: es })}
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
