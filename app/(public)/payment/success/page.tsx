"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Calendar, Users, Mail, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Reservation } from '@/lib/types';
import { format } from 'date-fns';
import { es as esLocale, enUS } from 'date-fns/locale';
import { useLocale } from '@/components/providers/locale-provider';

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 8; // ~16 segundos

type ReservationWithTitle = Reservation & { propertyTitle?: string };

/** Siempre muestra código de moneda (MXN, USD, EUR) para evitar confusión con el símbolo $. */
function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  if (c === 'MXN') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  if (c === 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function SuccessContent() {
  const { t, locale } = useLocale();
  const dateFnsLocale = locale === 'en' ? enUS : esLocale;
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const reservationId = searchParams.get('reservation');
  const [reservationData, setReservationData] = useState<ReservationWithTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  /** true = mostramos la reserva pero con mensaje "procesando" (webhook aún no corrió, p. ej. en local) */
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  /** Importe y moneda reales según Stripe (GET dedicado; evita depender solo del JSON de la reserva). */
  const [chargeFromStripe, setChargeFromStripe] = useState<{
    paidCurrency: string;
    paidAmount: number;
  } | null>(null);
  /** false hasta que termine el GET a Stripe (o no haya payment_intent). Evita mostrar USD un instante. */
  const [stripeChargeFetchDone, setStripeChargeFetchDone] = useState(() => paymentIntentId == null);

  useEffect(() => {
    if (!paymentIntentId) {
      setStripeChargeFetchDone(true);
      setChargeFromStripe(null);
      return;
    }
    let cancelled = false;
    setStripeChargeFetchDone(false);
    setChargeFromStripe(null);
    fetch(`/api/stripe/payment-intents/${encodeURIComponent(paymentIntentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data.paidAmount !== 'number' || !data.paidCurrency) return;
        setChargeFromStripe({
          paidAmount: data.paidAmount,
          paidCurrency: String(data.paidCurrency).toUpperCase(),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStripeChargeFetchDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId]);

  useEffect(() => {
    const confirmByPaymentIntent = async (): Promise<ReservationWithTitle | null> => {
      if (!paymentIntentId) return null;
      try {
        const response = await fetch('/api/reservations/confirm-by-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_intent_id: paymentIntentId }),
        });
        if (!response.ok) return null;
        return (await response.json()) as ReservationWithTitle;
      } catch {
        return null;
      }
    };

    const fetchByPaymentIntent = async (): Promise<ReservationWithTitle | null> => {
      try {
        const response = await fetch(`/api/reservations/by-payment-intent/${paymentIntentId}`);
        if (!response.ok) return response.status === 404 ? null : null;
        return (await response.json()) as ReservationWithTitle;
      } catch {
        return null;
      }
    };

    const fetchByReservationId = async (): Promise<ReservationWithTitle | null> => {
      if (!reservationId) return null;
      try {
        const response = await fetch(`/api/reservations/${reservationId}/confirmation`);
        if (!response.ok) return null;
        return (await response.json()) as ReservationWithTitle;
      } catch {
        return null;
      }
    };

    if (!paymentIntentId && !reservationId) {
      setError(t('success_error_id', 'Payment or reservation ID not found.'));
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const run = async (attempt: number) => {
      if (paymentIntentId) {
        const confirmed = await confirmByPaymentIntent();
        if (cancelled) return;
        if (confirmed) {
          setReservationData(confirmed);
          setLoading(false);
          setPolling(false);
          return;
        }
        const data = await fetchByPaymentIntent();
        if (cancelled) return;
        if (data) {
          setReservationData(data);
          setLoading(false);
          setPolling(false);
          return;
        }
      }

      if (paymentIntentId && attempt < POLL_MAX_ATTEMPTS - 1) {
        setPolling(true);
        timeoutId = setTimeout(() => run(attempt + 1), POLL_INTERVAL_MS);
        return;
      }

      if (reservationId) {
        const fallback = await fetchByReservationId();
        if (cancelled) return;
        if (fallback) {
          setReservationData(fallback);
          setPendingConfirmation(true);
          setLoading(false);
          setPolling(false);
          return;
        }
      }

      setError(t('success_error_slow', 'Confirmation is taking longer than usual. Check your email.'));
      setLoading(false);
      setPolling(false);
    };

    run(0);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [paymentIntentId, reservationId, t]);

  // Estado de Carga (inicial o polling)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
        <p className="text-lg text-gray-600">
          {polling ? t('success_processing', 'Processing your payment…') : t('success_loading', 'Loading confirmation…')}
        </p>
        {polling && (
          <p className="text-sm text-gray-500 mt-2">{t('success_webhook_note', 'Webhook may take a few seconds.')}</p>
        )}
      </div>
    );
  }

  // Estado de Error
  if (error || !reservationData) {
    return (
      <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-2">{t('error_loading_reservation', 'Error Loading Your Reservation')}</h2>
          <p className="text-red-700">{error || t('success_error_generic', 'Could not load booking details.')}</p>
          <Button asChild className="mt-6">
            <Link href="/">{t('back_home', 'Back Home')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const paidCurrency =
    chargeFromStripe?.paidCurrency ??
    (typeof reservationData.paidCurrency === 'string' ? reservationData.paidCurrency : undefined);
  const paidAmount =
    chargeFromStripe?.paidAmount ?? reservationData.paidAmount;
  const hasStripeCharge =
    typeof paidAmount === 'number' &&
    Number.isFinite(paidAmount) &&
    typeof paidCurrency === 'string' &&
    paidCurrency.length > 0;
  const waitStripeForTotal =
    Boolean(paymentIntentId) && !stripeChargeFetchDone && !chargeFromStripe;
  const hasPaidDisplay = hasStripeCharge;
  const paidTotalFormatted =
    hasPaidDisplay && paidCurrency ? formatMoney(paidAmount, paidCurrency) : null;
  const showUsdEquivalent =
    !waitStripeForTotal &&
    hasPaidDisplay &&
    paidCurrency !== 'USD' &&
    Number.isFinite(reservationData.totalAmount);
  const showUsdReferenceOnly =
    !waitStripeForTotal && !hasPaidDisplay && Number.isFinite(reservationData.totalAmount);

  // Estado de Éxito (datos cargados por payment_intent o por reservationId)
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success / Processing Message */}
      <Card className={`text-center ${pendingConfirmation ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
        <CardContent className="pt-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${pendingConfirmation ? 'bg-amber-500' : 'bg-green-500'}`}>
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${pendingConfirmation ? 'text-amber-800' : 'text-green-800'}`}>
            {pendingConfirmation ? t('payment_received', 'Payment received') : t('payment_success', 'Payment Successful!')}
          </h2>
          <p className={pendingConfirmation ? 'text-amber-700' : 'text-green-700'}>
            {pendingConfirmation
              ? t('payment_received_subtitle', 'Your payment is processing…')
              : t('payment_success_subtitle', 'Your booking is confirmed. You will receive an email shortly.')}
          </p>
        </CardContent>
      </Card>

      {/* Reservation Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reservation_details', 'Your Booking Details')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">
              {reservationData.propertyTitle ?? t('booking_title_fallback', 'Your booking')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('check_in', 'Check-in')}</p>
                  <p className="font-medium">{format(reservationData.checkIn, 'dd MMMM yyyy', { locale: dateFnsLocale })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('check_out', 'Check-out')}</p>
                  <p className="font-medium">{format(reservationData.checkOut, 'dd MMMM yyyy', { locale: dateFnsLocale })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">{t('guests', 'Guests')}</p>
                  <p className="font-medium">{reservationData.guests}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">
                    {hasPaidDisplay ? t('total_paid', 'Total paid') : showUsdReferenceOnly ? t('reservation_total_reference', 'Reservation total (reference)') : t('total_paid', 'Total paid')}
                  </p>
                  <p className="font-medium tabular-nums flex items-center gap-2 min-h-[1.5rem]">
                    {waitStripeForTotal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="text-gray-500 text-sm font-normal">
                          {t('success_fetching_amount', 'Fetching charge amount…')}
                        </span>
                      </>
                    ) : hasPaidDisplay && paidTotalFormatted ? (
                      paidTotalFormatted
                    ) : showUsdReferenceOnly ? (
                      formatMoney(reservationData.totalAmount, 'USD')
                    ) : (
                      '—'
                    )}
                  </p>
                  {showUsdEquivalent && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('success_base_usd', 'Reservation base (USD):')} {formatMoney(reservationData.totalAmount, 'USD')}
                    </p>
                  )}
                  {showUsdReferenceOnly && (
                    <p className="text-xs text-gray-500 mt-0.5">{t('success_usd_reference_note', 'USD amount on file; check Stripe for other currencies.')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
             <p className="text-sm text-gray-600 mb-2">
              <strong>{t('reservation_id', 'Booking ID')}:</strong> {reservationData.id}
            </p>
            <p className="text-sm text-gray-600">
              <strong>{t('confirmation_sent_to', 'Confirmation sent to')}:</strong> {reservationData.guestEmail}
            </p>
           </div>
        </CardContent>
      </Card>

      {/* What's Next (sin cambios) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('whats_next', "What's next?")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">{t('confirmation_by_email', 'Email confirmation')}</p>
              <p className="text-sm text-gray-600">
                {t('confirmation_by_email_subtitle', "You'll receive all booking details and check-in instructions.")}
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
             {t('explore_more_properties', 'Explore More Properties')}
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/services">
            {t('discover_experiences', 'Discover Experiences')}
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