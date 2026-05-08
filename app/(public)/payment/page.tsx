"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Shield, Calendar } from 'lucide-react';
import { CurrencySelect, type Currency } from '@/components/ui/currency-select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es as esLocale, enUS } from 'date-fns/locale';
import { calculateNights } from '@/lib/utils/date';
import { roundForDisplay } from '@/lib/round-display-money';
import { getUsdDisplayMultiplier } from '@/lib/display-exchange-rate';
import { useCart, getCartItemKey, getDraftFromStorage } from '@/lib/cart-context';
import { useLocale } from '@/components/providers/locale-provider';
import { resolveLodgingPricingFromTotalUsd } from '@/lib/lodging-taxes';

// Clave pública: disponible en build (NEXT_PUBLIC_*) o en runtime; evita undefined en loadStripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const RESERVATION_TIMEOUT_MINUTES = 10;

function parseCurrency(value: string | null): Currency {
  if (value === 'USD' || value === 'MXN' || value === 'EUR') return value;
  return 'USD';
}

function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function stripeErrorMessage(error: { type?: string; code?: string; message?: string }): string {
  const msg = error.message || '';
  if (error.code === 'card_declined') return 'Tu tarjeta fue rechazada. Revisa los datos o prueba con otro método de pago.';
  if (error.code === 'expired_card') return 'La tarjeta ha caducado. Usa otra tarjeta.';
  if (error.code === 'incorrect_cvc') return 'El código de seguridad (CVC) no es correcto.';
  if (error.code === 'insufficient_funds') return 'Fondos insuficientes en la tarjeta.';
  if (error.code === 'authentication_required') return 'Tu banco requiere verificar el pago. Intenta de nuevo.';
  if (msg.toLowerCase().includes('declined')) return 'El pago fue rechazado. Verifica los datos o usa otro método.';
  return msg || 'No se pudo completar el pago. Intenta de nuevo.';
}

/**
 * A component that renders a checkout form and handles payment confirmation using Stripe.
 * @example
 * CheckoutForm()
 * Returns a form element with payment handling and confirmation logic.
 * @returns {JSX.Element} A form component that facilitates the payment process by integrating with Stripe APIs.
 */
function CheckoutForm({ reservationId }: { reservationId: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useLocale();

  /**
   * Handles the payment confirmation process.
   * Prevents default form submission behavior, confirms payment with Stripe, and manages loading state and error handling.
   * 
   * @example
   * sync(event)
   * // Initiates payment confirmation process and handles errors or success.
   * 
   * @param {React.FormEvent} event - The form submission event to be prevented.
   * @returns {void} No return value.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      const returnUrl = new URL('/payment/success', window.location.origin);
      if (reservationId) returnUrl.searchParams.set('reservation', reservationId);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
        },
      });

      if (result.error) {
        toast.error(stripeErrorMessage(result.error));
      }
    } catch (error) {
      toast.error('Error procesando el pago. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border border-gray-200 rounded-lg">
        <PaymentElement />
      </div>
      
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('payment_processing', 'Processing Payment...')}
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {t('payment_confirm', 'Confirm Payment')}
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Handles the creation of a payment intent and displays payment information.
 * @example
 * PaymentContent()
 * Returns and displays the payment component interface.
 * @param {void} - This function takes no arguments.
 * @returns {JSX.Element} Returns a React component dealing with payment process creation and UI.
 */
type ReservationPaymentInfo = {
  propertyTitle?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  expiresAt?: string;
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getDraft, removeFromCart, addToCart, getItemByKey, updateCartItem, hydrated } = useCart();
  const reservationId = searchParams.get('reservation');
  const modification = searchParams.get('modification') === '1';
  const amountParam = searchParams.get('amount');
  const tokenParam = searchParams.get('token');
  const currencyParam = searchParams.get('currency');
  const initialCurrency = parseCurrency(currencyParam);
  const releasedRef = useRef(false);
  const createFromDraftStartedRef = useRef(false);
  const initializedReservationIdRef = useRef<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [amount, setAmount] = useState<number | null>(null);
  const [reservationInfo, setReservationInfo] = useState<ReservationPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [usdMxnRate, setUsdMxnRate] = useState<number | null>(null);
  const [usdEurRate, setUsdEurRate] = useState<number | null>(null);
  const previousCurrencyRef = useRef<Currency>(initialCurrency);
  const { t, locale } = useLocale();
  const dateFnsLocale = locale === 'en' ? enUS : esLocale;

  useEffect(() => {
    const draft = getDraft() || getDraftFromStorage();
    // Evitar repetir la inicialización para el mismo reservationId
    if (reservationId && initializedReservationIdRef.current === reservationId) {
      return;
    }
    if (!reservationId && draft && !createFromDraftStartedRef.current) {
      createFromDraftStartedRef.current = true;
      setLoading(true);
      setError('');
      fetch('/api/reservations/create-from-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: draft.propertyId,
          slug: draft.slug,
          checkIn: draft.checkIn,
          checkOut: draft.checkOut,
          guests: draft.guests ?? 1,
          guestName: draft.guestName,
          guestEmail: draft.guestEmail,
          guestPhone: draft.guestPhone,
          totalAmount: draft.totalAmount ?? 0,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          const id = data.reservationId;
          removeFromCart(getCartItemKey(draft));
          addToCart({ ...draft, reservationId: id });
          router.replace(`/payment?reservation=${id}`);
        })
        .catch((err) => setError(err?.message || 'Error al crear la reserva'))
        .finally(() => setLoading(false));
      return;
    }

    if (!reservationId) {
      setLoading(false);
      router.replace('/cart');
      return;
    }

    if (reservationId) {
      initializedReservationIdRef.current = reservationId;
    }

    if (modification && amountParam) {
      const amountVal = parseFloat(amountParam);
      if (Number.isNaN(amountVal) || amountVal < 0.5) {
        setError('Monto de diferencia no válido');
        setLoading(false);
        return;
      }
      setAmount(amountVal);
      if (tokenParam) {
        fetch(`/api/reservations/${reservationId}/modify-details?token=${encodeURIComponent(tokenParam)}`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.error && data.reservation) {
              const r = data.reservation;
              setReservationInfo({
                propertyTitle: data.property?.title,
                checkIn: typeof r.checkIn === 'string' ? r.checkIn : r.checkIn?.toISOString?.() ?? '',
                checkOut: typeof r.checkOut === 'string' ? r.checkOut : r.checkOut?.toISOString?.() ?? '',
                guests: r.guests ?? 1,
                totalAmount: amountVal,
              });
            }
          })
          .catch(() => {});
      }
      fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountVal, currency: currency.toLowerCase(), reservationId, modification: true }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.error) throw new Error(data.error);
          if (data?.clientSecret) setClientSecret(data.clientSecret);
        })
        .catch((err) => setError(err.message || 'Error creando intención de pago'))
        .finally(() => setLoading(false));
      return;
    }

    fetch(`/api/reservations/${reservationId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const totalAmount = data.totalAmount ?? 0;
        if (!totalAmount || totalAmount < 0.5) throw new Error('Monto de la reserva no válido');
        const checkIn = typeof data.checkIn === 'string' ? data.checkIn : data.checkIn?.toISOString?.();
        const checkOut = typeof data.checkOut === 'string' ? data.checkOut : data.checkOut?.toISOString?.();
        const expiresAt = data.expiresAt ? (typeof data.expiresAt === 'string' ? data.expiresAt : data.expiresAt?.toISOString?.()) : undefined;
        const expiry = expiresAt ? new Date(expiresAt).getTime() : 0;
        const now = Date.now();
        if (expiresAt && expiry <= now) {
          return fetch(`/api/reservations/${reservationId}/release`, { method: 'POST' }).then(() => {
            throw new Error('RESERVATION_EXPIRED');
          });
        }
        setAmount(totalAmount);
        setReservationInfo({
          propertyTitle: data.propertyTitle,
          checkIn,
          checkOut,
          guests: data.guests ?? 1,
          totalAmount,
          expiresAt,
        });
        if (expiresAt) {
          setSecondsLeft(Math.max(0, Math.floor((expiry - now) / 1000)));
        }
        return fetch(`/api/reservations/${reservationId}/hold`, { method: 'POST', credentials: 'include' }).then((holdRes) => {
          if (!holdRes.ok) return holdRes.json().then((err: { error?: string }) => { throw new Error(err.error || 'Error al bloquear fechas'); });
          const slug = (data as { propertySlug?: string }).propertySlug ?? '';
          const propertyId = data.propertyId as string;
          const item = { propertyId, slug, checkIn: checkIn ?? '', checkOut: checkOut ?? '', reservationId };
          const existing = getItemByKey(reservationId);
          if (existing) updateCartItem(reservationId, item);
          else addToCart(item);
          return { totalAmount, reservationId };
        });
      })
      .then((payload) => {
        if (!payload) return;
        const { totalAmount: totalAmountVal, reservationId: resId } = payload as { totalAmount: number; reservationId: string };
        return fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmountVal,
            currency: currency.toLowerCase(),
            reservationId: resId,
          }),
        });
      })
      .then((res) => res && res.json ? res.json() : null)
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        if (err.message === 'RESERVATION_EXPIRED') {
          router.replace('/cart');
          return;
        }
        setError(err.message || 'Error creando intención de pago');
      })
      .finally(() => setLoading(false));
    // No incluir `currency` aquí: el efecto dedicado recrea el PaymentIntent al cambiar moneda
    // y evita re-ejecutar hold/carga de reserva con semánticas mezcladas.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario anterior (`currency`)
  }, [reservationId, modification, amountParam, tokenParam, router, hydrated, getDraft, removeFromCart, addToCart, getItemByKey, updateCartItem]);

  useEffect(() => {
    if (currency === 'MXN') {
      fetch('/api/exchange-rate?from=USD&to=MXN')
        .then((r) => r.json())
        .then((data) => setUsdMxnRate(data.rate))
        .catch(() => setUsdMxnRate(17.2));
      setUsdEurRate(null);
    } else if (currency === 'EUR') {
      fetch('/api/exchange-rate?from=USD&to=EUR')
        .then((r) => r.json())
        .then((data) => setUsdEurRate(data.rate))
        .catch(() => setUsdEurRate(0.92));
      setUsdMxnRate(null);
    } else {
      setUsdMxnRate(null);
      setUsdEurRate(null);
    }
  }, [currency]);

  useEffect(() => {
    if (!reservationId || amount == null || loading) return;
    if (previousCurrencyRef.current === currency) return;
    previousCurrencyRef.current = currency;
    // `amount` es siempre USD (total de reserva); la API convierte a MXN/EUR al crear el intent.
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: currency.toLowerCase(),
        reservationId,
        modification,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        if (data?.clientSecret) setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        toast.error(err?.message || 'No se pudo actualizar la moneda de pago');
      });
  }, [currency, reservationId, amount, modification, loading]);

  const paymentCountdownActive = secondsLeft != null && secondsLeft > 0;
  useEffect(() => {
    if (!paymentCountdownActive) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s != null && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [paymentCountdownActive, reservationInfo?.expiresAt]);

  useEffect(() => {
    if (secondsLeft !== 0 || !reservationId || releasedRef.current) return;
    releasedRef.current = true;
    fetch(`/api/reservations/${reservationId}/release`, { method: 'POST' }).finally(() => {
      router.push('/cart');
    });
  }, [secondsLeft, reservationId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-4">{t('payment_error', 'Error')}</div>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="text-gray-500 mb-4">{t('payment_loading', 'Loading…')}</div>
        </CardContent>
      </Card>
    );
  }

  const displayAmountUsd = amount ?? 0;
  const { subtotalUsd, ivaUsd, ishUsd } = resolveLodgingPricingFromTotalUsd(displayAmountUsd);
  const rate = getUsdDisplayMultiplier(currency, usdMxnRate, usdEurRate);
  const displayAmount = roundForDisplay(displayAmountUsd * rate, currency);
  const subtotal = roundForDisplay(subtotalUsd * rate, currency);
  const ivaDisplay = roundForDisplay(ivaUsd * rate, currency);
  const ishDisplay = roundForDisplay(ishUsd * rate, currency);

  function formatPrice(val: number): string {
    if (currency === 'MXN') {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    }
    if (currency === 'EUR') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }
  const checkInDate = reservationInfo?.checkIn ? new Date(reservationInfo.checkIn) : null;
  const checkOutDate = reservationInfo?.checkOut ? new Date(reservationInfo.checkOut) : null;
  const nights = checkInDate && checkOutDate ? calculateNights(checkInDate, checkOutDate) : 0;

  return (
    <>
      {/* Temporizador fijo: mismo aspecto que antes, justo debajo de la línea del header */}
      {secondsLeft !== null && (
        <div className="fixed right-4 top-[4.2rem] md:top-[calc(4rem+1cm)] z-50 rounded-lg border bg-white px-4 py-2 shadow-md flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-500" />
          <span className={`font-mono text-lg font-semibold ${secondsLeft <= 60 ? 'text-red-600' : 'text-gray-800'}`}>
            {formatTimeLeft(secondsLeft)}
          </span>
          <span className="text-sm text-gray-500">{t('payment_timer_remaining', 'left')}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Aviso 10 minutos (solo reserva nueva; en modificación no hay tiempo límite) */}
      {secondsLeft !== null && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
          <p className="font-medium">{t('payment_minutes_warning', 'You have 10 minutes to complete payment.')}</p>
          <p className="mt-1">{t('payment_minutes_warning_detail', 'After that, dates will be released.')}</p>
        </div>
      )}
      {modification && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800 text-sm">
          <p className="font-medium">{t('payment_modification_notice', 'Payment for reservation change.')}</p>
        </div>
      )}

      {/* Resumen de reserva */}
      {reservationInfo && checkInDate && checkOutDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('payment_reservation_summary', 'Booking summary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('payment_property_label', 'Property:')}</span>
              <span className="font-medium text-right">{reservationInfo.propertyTitle ?? '—'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('check_in', 'Check-in')}:</span>
              <span className="font-medium">{format(checkInDate, 'dd MMMM yyyy', { locale: dateFnsLocale })}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('check_out', 'Check-out')}:</span>
              <span className="font-medium">{format(checkOutDate, 'dd MMMM yyyy', { locale: dateFnsLocale })}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600">{t('payment_total_guests', 'Total guests:')}</span>
              <span className="font-medium">{reservationInfo.guests ?? 1}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">{t('payment_total_nights', 'Total nights:')}</span>
                <span className="font-medium">{nights}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de pago */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="leading-none">{t('payment_summary', 'Payment Summary')}</CardTitle>
          <CurrencySelect value={currency} onValueChange={setCurrency} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>{t('payment_subtotal', 'Subtotal')}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('payment_tax_iva', 'VAT (16%)')}</span>
            <span>{formatPrice(ivaDisplay)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('payment_tax_ish', 'ISH / City tax (6%)')}</span>
            <span>{formatPrice(ishDisplay)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>{t('payment_total', 'Total')}</span>
            <span>{formatPrice(displayAmount)}</span>
          </div>
          <p className="text-xs text-gray-500 pt-1">
            {t('payment_currency_note', 'You will be charged in {currency} based on the selected currency.').replace(
              '{currency}',
              currency === 'MXN'
                ? t('payment_currency_name_mxn', 'Mexican pesos (MXN)')
                : currency === 'EUR'
                  ? t('payment_currency_name_eur', 'euros (EUR)')
                  : t('payment_currency_name_usd', 'US dollars (USD)')
            )}
          </p>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('payment_info', 'Payment Information')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm reservationId={reservationId} />
          </Elements>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">{t('payment_secure_title', '100% Secure Payment')}</p>
              <p>{t('payment_secure_subtitle', 'Your information is protected with bank-level SSL encryption.')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}

/**
 * Renders the payment page for finalizing reservations.
 * @example
 * PaymentPage()
 * <div className="min-h-screen bg-gray-50 py-12">...</div>
 * @returns {JSX.Element} JSX component of the payment page.
 */
export default function PaymentPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('payment_title', 'Complete Reservation')}</h1>
          <p className="text-gray-600">{t('payment_subtitle', 'Complete your payment to confirm your booking')}</p>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        }>
          <PaymentContent />
        </Suspense>
      </div>
    </div>
  );
}