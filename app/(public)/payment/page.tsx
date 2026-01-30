"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Shield, Check } from 'lucide-react';
import { toast } from 'sonner';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * A component that renders a checkout form and handles payment confirmation using Stripe.
 * @example
 * CheckoutForm()
 * Returns a form element with payment handling and confirmation logic.
 * @returns {JSX.Element} A form component that facilitates the payment process by integrating with Stripe APIs.
 */
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (result.error) {
        toast.error(result.error.message || 'Error en el pago');
      }
    } catch (error) {
      toast.error('Error procesando el pago');
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
            Procesando Pago...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Confirmar Pago
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
function PaymentContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('reservation');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [amount, setAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!reservationId) {
      setError('Reserva no encontrada');
      setLoading(false);
      return;
    }

    // 1. Obtener la reserva (incluye totalAmount)
    fetch(`/api/reservations/${reservationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        const totalAmount = data.totalAmount ?? 0;
        if (!totalAmount || totalAmount < 0.5) {
          throw new Error('Monto de la reserva no válido');
        }
        setAmount(totalAmount);

        // 2. Crear Payment Intent con el monto real
        return fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalAmount,
            currency: 'usd',
            reservationId,
          }),
        });
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setClientSecret(data.clientSecret);
      })
      .catch((err) => {
        setError(err.message || 'Error creando intención de pago');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reservationId]);

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
          <div className="text-red-500 mb-4">Error</div>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="text-gray-500 mb-4">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  const displayAmount = amount ?? 0;
  const serviceFee = Math.round(displayAmount * 0.1);
  const subtotal = displayAmount - serviceFee;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Tarifa de servicio</span>
            <span>${serviceFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span>${displayAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div className="text-sm text-green-800">
              <p className="font-medium mb-1">Pago 100% Seguro</p>
              <p>Tu información está protegida con encriptación SSL de nivel bancario.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Finalizar Reserva</h1>
          <p className="text-gray-600">Completa tu pago para confirmar la reserva</p>
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