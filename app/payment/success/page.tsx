"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Calendar, MapPin, Users, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Renders the success content for a completed payment, displaying reservation details and next steps.
 * @example
 * <SuccessContent />
 * // Renders the success page for the payment, including reservation details
 * @returns {JSX.Element} The JSX content of the success page, showing a confirmation message, reservation details, next steps, and available actions for the user.
**/
function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  
  // Mock reservation data - in production, fetch based on payment intent
  const reservationData = {
    id: '12345',
    propertyTitle: 'Casa Alkimia Suite Ocean View',
    checkIn: '2024-12-20',
    checkOut: '2024-12-23',
    guests: 2,
    total: 450,
    guestEmail: 'guest@example.com',
  };

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
            <h3 className="font-semibold text-lg">{reservationData.propertyTitle}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">{reservationData.checkIn}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">{reservationData.checkOut}</p>
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
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Pagado</p>
                  <p className="font-medium">${reservationData.total}</p>
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

      {/* What's Next */}
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
          
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Recordatorios</p>
              <p className="text-sm text-gray-600">
                Te enviaremos recordatorios útiles antes de tu llegada.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
            <div>
              <p className="font-medium">Soporte 24/7</p>
              <p className="text-sm text-gray-600">
                Estamos aquí para ayudarte antes y durante tu estancia.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
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
        <Suspense fallback={<div>Cargando...</div>}>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}