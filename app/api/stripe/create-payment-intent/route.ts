import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', reservationId, modification } = await request.json();

    // Validate amount (Stripe minimum is $0.50 USD)
    if (!amount || amount < 0.5) {
      return NextResponse.json(
        { error: 'El monto debe ser de al menos $0.50 USD' },
        { status: 400 }
      );
    }

    // Create payment intent
    const metadata: Record<string, string> = { reservationId: reservationId || '' };
    if (modification === true || modification === '1') metadata.modification = '1';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}