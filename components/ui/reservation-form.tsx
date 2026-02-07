"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Property } from '@/lib/types';
import { calculateNights } from '@/lib/utils/date';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';
import { useCart } from '@/lib/cart-context';
import { CreditCard, Loader2, Users, Calendar, AlertCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

function dateRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

interface ReservationFormProps {
  property: Property;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
  onReservationComplete?: () => void;
}

/**
 * Renders a reservation form component for booking a property.
 * @example
 * <ReservationForm property={property} selectedDates={selectedDates} onReservationComplete={callbackFunction} />
 * @param {ReservationFormProps} {property} - The property object containing details, including price per night and maximum number of guests.
 * @param {Object} {selectedDates} - An object containing the check-in and check-out dates for the reservation.
 * @param {Function} {onReservationComplete} - A callback function that is executed once the reservation process is complete.
 * @returns {JSX.Element} The reservation form component to be rendered within a React application.
 */
export default function ReservationForm({ 
  property, 
  selectedDates,
  onReservationComplete 
}: ReservationFormProps) {
  const router = useRouter();
  const { cart, setDraft } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [datesUnavailable, setDatesUnavailable] = useState(false);
  const [showOverlapMessage, setShowOverlapMessage] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guests: 1,
  });

  const hasFullRange = Boolean(selectedDates?.checkIn && selectedDates?.checkOut);
  const nights = hasFullRange && selectedDates ? calculateNights(selectedDates.checkIn!, selectedDates.checkOut!) : 0;

  useEffect(() => {
    setDatesUnavailable(false);
    setShowOverlapMessage(false);
  }, [selectedDates?.checkIn?.getTime(), selectedDates?.checkOut?.getTime()]);
  const subtotal = nights * property.pricePerNight;
  const fees = Math.round(subtotal * 0.1); // 10% service fee
  const total = subtotal + fees;

  /**
   * Handles form submission for creating a reservation and redirects to payment on success.
   * @example
   * sync(event)
   * // Triggers reservation creation, date blocking, and payment redirection.
   * @param {React.FormEvent} e - The form event triggered by submission, prevents default behavior.
   * @returns {void} Executes reservation logic, updates UI based on success or failure, and manages redirection.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasFullRange || !selectedDates?.checkIn || !selectedDates?.checkOut) {
      toast.error('Por favor selecciona las fechas de tu estancia');
      return;
    }

    if (formData.guests > property.maxGuests) {
      toast.error(`Esta propiedad acepta máximo ${property.maxGuests} huéspedes`);
      return;
    }

    const cartItemsWithSameProperty = cart?.filter((c) => c.propertyId === property.id && c.checkIn && c.checkOut) ?? [];
    for (const c of cartItemsWithSameProperty) {
      const cartStart = new Date(c.checkIn);
      const cartEnd = new Date(c.checkOut);
      if (cartStart.getTime() === selectedDates.checkIn.getTime() && cartEnd.getTime() === selectedDates.checkOut.getTime()) continue;
      if (dateRangesOverlap(selectedDates.checkIn, selectedDates.checkOut, cartStart, cartEnd)) {
        setShowOverlapMessage(true);
        return;
      }
    }

    setIsLoading(true);
    setDatesUnavailable(false);
    setShowOverlapMessage(false);

    try {
      const { available } = await checkPropertyAvailability(
        property.id,
        selectedDates.checkIn,
        selectedDates.checkOut
      );
      if (!available) {
        setDatesUnavailable(true);
        setIsLoading(false);
        return;
      }

      setDraft({
        propertyId: property.id,
        slug: property.slug,
        checkIn: selectedDates.checkIn.toISOString(),
        checkOut: selectedDates.checkOut.toISOString(),
        guests: formData.guests,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        totalAmount: total,
      });
      toast.success('Redirigiendo al pago...');
      router.push('/payment');
      onReservationComplete?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al preparar la reserva. Por favor intenta nuevamente.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedDates?.checkIn || !selectedDates?.checkOut) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Selecciona las fechas en el calendario para continuar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (datesUnavailable) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-10 w-10 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Las fechas no están disponibles</p>
              <p className="text-sm text-amber-800 mt-1">Pueden estar reservadas o confirmadas por otro huésped. Elige otras fechas para esta propiedad.</p>
              <Button asChild className="mt-4">
                <Link href={`/properties/${property.slug}`}>Ir a la propiedad</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showOverlapMessage) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <ShoppingCart className="h-10 w-10 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900">Ya tienes una reserva similar</p>
              <p className="text-sm text-orange-800 mt-1">Las fechas que elegiste se superponen con una reserva que ya tienes en el carrito (en proceso o en hold). ¿Quieres continuar con esa reserva?</p>
              <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600">
                <Link href="/cart">Continuar al carrito</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Reservar Ahora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="guestName">Nombre completo *</Label>
              <Input
                id="guestName"
                type="text"
                required
                value={formData.guestName}
                onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <Label htmlFor="guestEmail">Correo electrónico *</Label>
              <Input
                id="guestEmail"
                type="email"
                required
                value={formData.guestEmail}
                onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="guestPhone">Teléfono *</Label>
              <Input
                id="guestPhone"
                type="tel"
                required
                value={formData.guestPhone}
                onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div>
              <Label htmlFor="guests">Número de huéspedes *</Label>
              <Select 
                value={formData.guests.toString()} 
                onValueChange={(value) => setFormData({ ...formData, guests: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {num} {num === 1 ? 'huésped' : 'huéspedes'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Price Breakdown */}
          <div className="space-y-3">
            <h3 className="font-semibold">Resumen de precios</h3>
            
            <div className="flex justify-between text-sm">
              <span>${property.pricePerNight} × {nights} {nights === 1 ? 'noche' : 'noches'}</span>
              <span>${subtotal}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Tarifa de servicio</span>
              <span>${fees}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Continuar al Pago
              </>
            )}
          </Button>
        </form>

        <div className="text-xs text-gray-600 space-y-1.5">
          <p>• Tu reserva queda confirmada al completar el pago de forma segura.</p>
          <p>• Puedes cancelar sin costo hasta 2 horas después de pagar; después aplican las políticas de cancelación.</p>
          <p>• Te enviamos la confirmación por email al instante.</p>
        </div>
      </CardContent>
    </Card>
  );
}