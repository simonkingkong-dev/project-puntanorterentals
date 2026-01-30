// Archivo: app/(public)/payment/success/page.tsx (Completo)

"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Calendar, Users, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reservation } from '@/lib/types'; // Importamos el tipo
import { format } from 'date-fns'; // Para formatear fechas
import { es } from 'date-fns/locale';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 8; // ~16 segundos

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const [reservationData, setReservationData] = useState<(Reservation & { propertyTitle?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!paymentIntentId) {
      setError('ID de pago no encontrado.');
      setLoading(false);
      return;
    }

    const fetchReservation = async () => {
      try {
        const response = await fetch(`/api/reservations/by-payment-intent/${paymentIntentId}`);
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error('No pudimos encontrar los detalles de tu reservación.');
        }
        return (await response.json()) as Reservation & { propertyTitle?: string };
      } catch {
        return null;
      }
    };

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tryOnce = async (attempt: number) => {
      const data = await fetchReservation();
      if (cancelled) return;
      if (data) {
        setReservationData(data);
        setLoading(false);
        setPolling(false);
        return;
      }
      if (attempt >= POLL_MAX_ATTEMPTS - 1) {
        setError('La confirmación está tardando más de lo habitual. Revisa tu correo; si el pago fue exitoso, recibirás la confirmación ahí.');
        setLoading(false);
        setPolling(false);
        return;
      }
      setPolling(true);
      timeoutId = setTimeout(() => tryOnce(attempt + 1), POLL_INTERVAL_MS);
    };

    tryOnce(0);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentIntentId]);

  // Estado de Carga (inicial o polling)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
        <p className="text-lg text-gray-600">
          {polling ? 'Procesando tu pago... Un momento.' : 'Cargando confirmación...'}
        </p>
        {polling && (
          <p className="text-sm text-gray-500 mt-2">
            El webhook puede tardar unos segundos en confirmar la reserva.
          </p>
        )}
      </div>
    );
  }

  // Estado de Error
  if (error || !reservationData) {
    return (
      <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error al Cargar tu Reserva</h2>
          <p className="text-red-700">{error || 'No se pudieron cargar los detalles de la reservación.'}</p>
          <Button asChild className="mt-6">
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado de Éxito (ahora con datos reales)
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Message */}
      <Card className="text-center border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
           </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">
            ¡Pago Exitoso!
          </h2>
          <p className="text-green-700">
            Tu reserva ha sido confirmada. Recibirás un correo de confirmación en breve.
          </p>
        </CardContent>
      </Card>

      {/* Reservation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de tu Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {reservationData.propertyTitle ?? `Propiedad ...${reservationData.propertyId.slice(-8)}`}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">{format(reservationData.checkIn, 'dd MMMM yyyy', { locale: es })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">{format(reservationData.checkOut, 'dd MMMM yyyy', { locale: es })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Huéspedes</p>
                  <p className="font-medium">{reservationData.guests}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" /> {/* Reemplazado MapPin */}
                <div>
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="font-medium">${reservationData.totalAmount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
             <p className="text-sm text-gray-600 mb-2">
              <strong>ID de Reserva:</strong> {reservationData.id}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Confirmación enviada a:</strong> {reservationData.guestEmail}
            </p>
           </div>
        </CardContent>
      </Card>

      {/* What's Next (sin cambios) */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué sigue?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Confirmación por email</p>
              <p className="text-sm text-gray-600">
                Recibirás todos los detalles de tu reserva y las instrucciones de check-in.
              </p>
            </div>
          </div>
          {/* ... otros items de "What's Next" ... */}
        </CardContent>
      </Card>

      {/* Actions (sin cambios) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild className="flex-1">
          <Link href="/properties">
             Explorar Más Propiedades
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/services">
            Descubrir Experiencias
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Envolvemos en Suspense para que useSearchParams funcione */}
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">Cargando...</p>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}