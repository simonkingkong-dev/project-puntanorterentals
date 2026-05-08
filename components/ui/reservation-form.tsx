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
import { CreditCard, Loader2, Users, Calendar, AlertCircle, ShoppingCart, ChevronRight } from 'lucide-react';
import type { Currency } from '@/components/ui/currency-select';
import { roundForDisplay } from '@/lib/round-display-money';
import { getUsdDisplayMultiplier } from '@/lib/display-exchange-rate';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/locale-provider';
import {
  computeExtraGuestFeesUsd,
  getExtraGuestFeePerNightUsd,
  getIncludedGuests,
} from '@/lib/pricing-guests';
import { computeLodgingTaxesUsd } from '@/lib/lodging-taxes';

function dateRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

interface ReservationFormProps {
  property: Property;
  selectedDates?: { checkIn?: Date; checkOut?: Date };
  bookingGuests: number;
  onBookingGuestsChange: (n: number) => void;
  onReservationComplete?: () => void;
  currency?: Currency;
  pricePerNightDisplay?: number;
  usdMxnRate?: number | null;
  usdEurRate?: number | null;
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ReservationForm({ 
  property, 
  selectedDates,
  bookingGuests,
  onBookingGuestsChange,
  onReservationComplete,
  currency = 'USD',
  pricePerNightDisplay,
  usdMxnRate = null,
  usdEurRate = null,
}: ReservationFormProps) {
  const router = useRouter();
  const { t } = useLocale();
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
  const nightlySubtotalUsd = hostfullyNightlyTotal ?? nights * (property.pricePerNight ?? 0);
  const extraGuestFeesUsd = useMemo(
    () => computeExtraGuestFeesUsd(bookingGuests, nights, property),
    [bookingGuests, nights, property.includedGuests, property.extraGuestFeePerNight, property]
  );
  const subtotalUsd = nightlySubtotalUsd + extraGuestFeesUsd;
  const { ivaUsd, ishUsd, taxesUsd } = useMemo(
    () => computeLodgingTaxesUsd(subtotalUsd),
    [subtotalUsd]
  );
  const totalUsd = subtotalUsd + taxesUsd;
  const displayRate = getUsdDisplayMultiplier(currency, usdMxnRate, usdEurRate);
  const nightlyDisplay = roundForDisplay(nightlySubtotalUsd * displayRate, currency);
  const extraGuestDisplay = roundForDisplay(extraGuestFeesUsd * displayRate, currency);
  const subtotal = roundForDisplay(subtotalUsd * displayRate, currency);
  const ivaDisplay = roundForDisplay(ivaUsd * displayRate, currency);
  const ishDisplay = roundForDisplay(ishUsd * displayRate, currency);
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
      toast.error(t('toast_select_dates', 'Please select your stay dates'));
      return;
    }

    if (bookingGuests > property.maxGuests) {
      toast.error(
        t('toast_max_guests', 'This property accepts up to {n} guests').replace(
          '{n}',
          String(property.maxGuests)
        )
      );
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
          guests: bookingGuests,
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

      toast.success(t('toast_redirecting', 'Redirecting to payment…'));
      router.push(`/payment?reservation=${reservationId}&currency=${currency}`);
      onReservationComplete?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : t('toast_prepare_error', 'Could not prepare the booking. Please try again.');
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
            <p className="text-gray-600">
              {t('reservation_select_dates_prompt', 'Select dates on the calendar to continue')}
            </p>
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
              <p className="font-medium text-amber-900">
                {t('reservation_dates_unavailable_title', 'Those dates are not available')}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                {t('reservation_dates_unavailable_body', 'They may be booked or held by another guest.')}
              </p>
              <Button asChild className="mt-4">
                <Link href={`/properties/${property.slug}`}>
                  {t('reservation_go_property', 'Go to property')}
                </Link>
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
              <p className="font-medium text-orange-900">{t('reservation_overlap_title', 'Similar booking in cart')}</p>
              <p className="text-sm text-orange-800 mt-1">{t('reservation_overlap_body', 'Dates overlap with a cart item.')}</p>
              <Button asChild className="mt-4 bg-orange-500 hover:bg-orange-600">
                <Link href="/cart">{t('reservation_go_cart', 'Go to cart')}</Link>
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
          {t('reservation_form_title', 'Book now')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="guestFirstName">{t('reservation_first_name', 'First name *')}</Label>
              <Input
                id="guestFirstName"
                type="text"
                required
                value={formData.guestFirstName}
                onChange={(e) => setFormData({ ...formData, guestFirstName: e.target.value })}
                placeholder={t('placeholder_first_name', 'First name')}
              />
            </div>
            <div>
              <Label htmlFor="guestLastName">{t('reservation_last_name', 'Last name *')}</Label>
              <Input
                id="guestLastName"
                type="text"
                required
                value={formData.guestLastName}
                onChange={(e) => setFormData({ ...formData, guestLastName: e.target.value })}
                placeholder={t('placeholder_last_name', 'Last name')}
              />
            </div>

            <div>
              <Label htmlFor="guestEmail">{t('reservation_email', 'Email *')}</Label>
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
                {t('reservation_phone_legend', 'Phone *')}
              </legend>
              <div className="flex gap-2">
                <Select
                  value={formData.phoneCountryCode}
                  onValueChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                  aria-label={t('reservation_phone_country_aria', 'Country code')}
                >
                  <SelectTrigger id="guestPhone-country" className="w-[140px] shrink-0">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-1">
                      <Input
                        placeholder={t('reservation_phone_search', 'Search country…')}
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
                  aria-label={t('reservation_phone_number_aria', 'Phone number')}
                />
              </div>
            </fieldset>

            <div>
              <Label htmlFor="guests">{t('reservation_guests_label', 'Number of guests *')}</Label>
              <Select
                value={bookingGuests.toString()}
                onValueChange={(value) => onBookingGuestsChange(parseInt(value, 10))}
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
            <h3 className="font-semibold">{t('reservation_price_summary', 'Price summary')}</h3>
            <p className="text-xs text-gray-500">
              {t('pricing_guests_included_short', 'Base rate includes {n} guests').replace(
                '{n}',
                String(getIncludedGuests(property))
              )}
            </p>

            <div className="flex justify-between text-sm">
              <span>{t('pricing_accommodation', 'Accommodation (nights)')}</span>
              <span>{formatPrice(nightlyDisplay, currency)}</span>
            </div>
            {nights > 0 && (
              <details className="rounded-md p-2 text-sm [&[open]_.nightly-chevron]:rotate-90">
                <summary className="cursor-pointer text-gray-500 list-none flex items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="nightly-chevron h-4 w-4 text-gray-500 transition-transform duration-200 ease-out" />
                  <span>{t('reservation_nightly_detail', 'View nightly breakdown')}</span>
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
            {extraGuestFeesUsd > 0 && (
              <div className="flex justify-between text-sm">
                <span>
                  {t('pricing_extra_guests', 'Extra guests')}
                  <span className="block text-xs text-gray-500 font-normal">
                    ({Math.max(0, bookingGuests - getIncludedGuests(property))} x {getExtraGuestFeePerNightUsd(property)} USD {t('pricing_per_night', 'por noche')})
                  </span>
                </span>
                <span>{formatPrice(extraGuestDisplay, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {t('payment_subtotal', 'Subtotal')}
              </span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('payment_tax_iva', 'VAT (16%)')}</span>
              <span>{formatPrice(ivaDisplay, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t('payment_tax_ish', 'ISH / City tax (6%)')}</span>
              <span>{formatPrice(ishDisplay, currency)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>{t('payment_total', 'Total')}</span>
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
                {t('reservation_processing', 'Processing…')}
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {t('reservation_continue_payment', 'Continue to payment')}
              </>
            )}
          </Button>
        </form>

        <div className="text-xs text-gray-600 space-y-1.5">
          <p>• {t('reservation_footnote_confirm', 'Booking confirms after secure payment.')}</p>
          <p>• {t('reservation_footnote_cancel', 'Free cancel window applies per policy.')}</p>
          <p>• {t('reservation_footnote_email', 'Confirmation email sent immediately.')}</p>
        </div>
      </CardContent>
    </Card>
  );
}