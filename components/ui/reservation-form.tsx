"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Property } from '@/lib/types';
import { calculateNights } from '@/lib/utils/date';
import { createReservation } from '@/lib/firebase/reservations';
import { updatePropertyAvailability } from '@/lib/firebase/properties';
import { generateDateRange } from '@/lib/utils/date';
import { CreditCard, Loader2, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface ReservationFormProps {
  property: Property;
  selectedDates?: { checkIn: Date; checkOut: Date };
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
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guests: 1,
  });

  const nights = selectedDates ? calculateNights(selectedDates.checkIn, selectedDates.checkOut) : 0;
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
    
    if (!selectedDates) {
      toast.error('Por favor selecciona las fechas de tu estancia');
      return;
    }

    if (formData.guests > property.maxGuests) {
      toast.error(`Esta propiedad acepta máximo ${property.maxGuests} huéspedes`);
      return;
    }

    setIsLoading(true);

    try {
      // Create reservation
      const reservationId = await createReservation({
        propertyId: property.id,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        checkIn: selectedDates.checkIn,
        checkOut: selectedDates.checkOut,
        guests: formData.guests,
        totalAmount: total,
        status: 'pending',
      });

      // Block dates in property availability
      const datesToBlock = generateDateRange(selectedDates.checkIn, selectedDates.checkOut);
      await updatePropertyAvailability(property.id, datesToBlock, false);

      toast.success('Reserva creada exitosamente');
      
      // Redirect to payment
      router.push(`/payment?reservation=${reservationId}`);
      
      onReservationComplete?.();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Error al crear la reserva. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedDates) {
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

        <div className="text-xs text-gray-600 space-y-1">
          <p>• No se cobrará hasta confirmar la reserva</p>
          <p>• Cancelación gratuita 24 horas antes</p>
          <p>• Confirmación inmediata por email</p>
        </div>
      </CardContent>
    </Card>
  );
}