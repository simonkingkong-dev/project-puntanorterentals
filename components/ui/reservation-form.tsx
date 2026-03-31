"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Property } from '@/lib/types';
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE } from '@/lib/country-codes';
import { calculateNights } from '@/lib/utils/date';
import { useCart } from '@/lib/cart-context';
import { CreditCard, Loader2, Users, Calendar, AlertCircle, ShoppingCart } from 'lucide-react';
import type { Currency } from '@/components/ui/currency-select';
import { roundForDisplay } from '@/lib/round-display-money';
import { toast } from 'sonner';

function dateRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

interface ReservationFormProps {
  property: Property;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
  onReservationComplete?: () => void;
  currency?: Currency;
  pricePerNightDisplay?: number;
  usdMxnRate?: number | null;
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
function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'MXN') {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount);
  }
  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function ReservationForm({ 
  property, 
  selectedDates,
  onReservationComplete,
  currency = 'USD',
  pricePerNightDisplay,
  usdMxnRate = null,
}: ReservationFormProps) {
  const router = useRouter();
  const { cart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [datesUnavailable, setDatesUnavailable] = useState(false);
  const [showOverlapMessage, setShowOverlapMessage] = useState(false);
  const defaultCountryShort = COUNTRY_CODES.find((c) => c.code === DEFAULT_COUNTRY_CODE)?.short ?? 'mx';
  const [formData, setFormData] = useState({
    guestFirstName: '',
    guestLastName: '',
    guestEmail: '',
    guestPhone: '',
    phoneCountryCode: defaultCountryShort,
    guests: 1,
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [hostfullyNightlyTotal, setHostfullyNightlyTotal] = useState<number | null>(null);
  const [nightlyBreakdown, setNightlyBreakdown] = useState<Array<{ date: string; amount: number }>>([]);

  const filteredCountryCodes = useMemo(() => {
    const search = countrySearch.trim().toLowerCase();
    if (!search) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(({ country, code, short: shortCode }) => {
      const haystack = `${country} ${code} ${shortCode}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [countrySearch]);

  const hasFullRange = Boolean(selectedDates?.checkIn && selectedDates?.checkOut);
  const nights = hasFullRange && selectedDates ? calculateNights(selectedDates.checkIn!, selectedDates.checkOut!) : 0;
  const pricePerNight = pricePerNightDisplay ?? property.pricePerNight;

  const selectedCheckInTime = selectedDates?.checkIn?.getTime();
  const selectedCheckOutTime = selectedDates?.checkOut?.getTime();
  const selectedCheckInDate = selectedDates?.checkIn;
  const selectedCheckOutDate = selectedDates?.checkOut;
  useEffect(() => {
    setDatesUnavailable(false);
    setShowOverlapMessage(false);
  }, [selectedCheckInTime, selectedCheckOutTime]);
  useEffect(() => {
    if (!property.hostfullyPropertyId || !selectedCheckInDate || !selectedCheckOutDate) {
      setHostfullyNightlyTotal(null);
      setNightlyBreakdown([]);
      return;
    }
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let cancelled = false;
    fetch(
      `/api/properties/calendar?propertyId=${encodeURIComponent(property.id)}&startDate=${toDateStr(
        selectedCheckInDate
      )}&endDate=${toDateStr(selectedCheckOutDate)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rates =
          data?.dailyRates && typeof data.dailyRates === 'object'
            ? (data.dailyRates as Record<string, number>)
            : {};
        const nightsInRange = calculateNights(selectedCheckInDate, selectedCheckOutDate);
        if (nightsInRange <= 0) {
          setHostfullyNightlyTotal(null);
          return;
        }
        let total = 0;
        const breakdown: Array<{ date: string; amount: number }> = [];
        const cursor = new Date(
          selectedCheckInDate.getFullYear(),
          selectedCheckInDate.getMonth(),
          selectedCheckInDate.getDate()
        );
        const end = new Date(
          selectedCheckOutDate.getFullYear(),
          selectedCheckOutDate.getMonth(),
          selectedCheckOutDate.getDate()
        );
        while (cursor < end) {
          const key = toDateStr(cursor);
          const amount = Number(rates[key]) > 0 ? Number(rates[key]) : pricePerNight;
          total += amount;
          breakdown.push({ date: key, amount });
          cursor.setDate(cursor.getDate() + 1);
        }
        setHostfullyNightlyTotal(Math.round(total));
        setNightlyBreakdown(breakdown);
      })
      .catch(() => {
        if (!cancelled) {
          setHostfullyNightlyTotal(null);
          setNightlyBreakdown([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [property.id, property.hostfullyPropertyId, selectedCheckInTime, selectedCheckOutTime, pricePerNight, selectedCheckInDate, selectedCheckOutDate]);
  const subtotalUsd = hostfullyNightlyTotal ?? nights * (property.pricePerNight ?? 0);
  const feesUsd = Math.round(subtotalUsd * 0.1); // 10% service fee
  const totalUsd = subtotalUsd + feesUsd;
  const displayRate = currency === 'MXN' && usdMxnRate != null ? usdMxnRate : 1;
  const subtotal = roundForDisplay(subtotalUsd * displayRate, currency);
  const fees = roundForDisplay(feesUsd * displayRate, currency);
  const total = roundForDisplay(totalUsd * displayRate, currency);

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
      const availabilityRes = await fetch('/api/properties/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn: selectedDates.checkIn.toISOString(),
          checkOut: selectedDates.checkOut.toISOString(),
        }),
      });
      const { available } = await availabilityRes.json();
      if (!available) {
        setDatesUnavailable(true);
        setIsLoading(false);
        return;
      }

      const dialCode = COUNTRY_CODES.find((c) => c.short === formData.phoneCountryCode)?.code ?? DEFAULT_COUNTRY_CODE;
      const guestPhoneStr = [dialCode, formData.guestPhone].filter(Boolean).join(' ').trim() || formData.guestPhone;
      const checkInStr = selectedDates.checkIn.toISOString();
      const checkOutStr = selectedDates.checkOut.toISOString();

      const res = await fetch('/api/reservations/create-from-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          slug: property.slug,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          guests: formData.guests,
          guestName: `${formData.guestFirstName} ${formData.guestLastName}`.trim(),
          guestFirstName: formData.guestFirstName,
          guestLastName: formData.guestLastName,
          guestEmail: formData.guestEmail,
          guestPhone: guestPhoneStr,
          totalAmount: totalUsd,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const reservationId = data.reservationId;
      if (!reservationId) throw new Error('No se recibió ID de reserva');

      toast.success('Redirigiendo al pago...');
      router.push(`/payment?reservation=${reservationId}`);
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

  const guestOptionsCount = Math.max(1, property.maxGuests);

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
              <Label htmlFor="guestFirstName">Nombre *</Label>
              <Input
                id="guestFirstName"
                type="text"
                required
                value={formData.guestFirstName}
                onChange={(e) => setFormData({ ...formData, guestFirstName: e.target.value })}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <Label htmlFor="guestLastName">Apellido *</Label>
              <Input
                id="guestLastName"
                type="text"
                required
                value={formData.guestLastName}
                onChange={(e) => setFormData({ ...formData, guestLastName: e.target.value })}
                placeholder="Tu apellido"
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

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Teléfono *
              </legend>
              <div className="flex gap-2">
                <Select
                  value={formData.phoneCountryCode}
                  onValueChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                  aria-label="Código de país"
                >
                  <SelectTrigger id="guestPhone-country" className="w-[140px] shrink-0">
                    <SelectValue placeholder="Código" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-1">
                      <Input
                        placeholder="Buscar país..."
                        className="h-8 text-xs"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                      />
                    </div>
                    {filteredCountryCodes.map(({ code, short: shortCode, country }) => (
                      <SelectItem key={shortCode} value={shortCode}>
                        {code} {shortCode} — {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="guestPhone"
                  type="tel"
                  required
                  value={formData.guestPhone}
                  onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                  placeholder="123 456 7890"
                  className="flex-1"
                  aria-label="Número de teléfono"
                />
              </div>
            </fieldset>

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
                  {Array.from({ length: guestOptionsCount }, (_, i) => i + 1).map((num) => (
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
              <span>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {nights > 0 && (
              <details className="rounded-md p-2 text-sm [&[open]_.nightly-chevron]:rotate-90">
                <summary className="cursor-pointer text-gray-500 list-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <span className="nightly-chevron text-gray-500 inline-block transition-transform duration-200 ease-out">{'>'}</span>
                  <span>Ver detalle por noche</span>
                </summary>
                <div className="mt-2 space-y-1">
                  {(nightlyBreakdown.length > 0
                    ? nightlyBreakdown
                    : Array.from({ length: nights }, (_, i) => ({ date: `Noche ${i + 1}`, amount: property.pricePerNight }))
                  ).map((night, idx) => (
                    <div key={`${night.date}-${idx}`} className="flex justify-between text-gray-600">
                      <span>{night.date}</span>
                      <span>{formatPrice(roundForDisplay(night.amount * displayRate, currency), currency)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
            
            <div className="flex justify-between text-sm">
              <span>Tarifa de servicio</span>
              <span>{formatPrice(fees, currency)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
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