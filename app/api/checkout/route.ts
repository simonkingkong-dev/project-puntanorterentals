import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase/config';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { propertyId, propertyName, startDate, endDate, totalPrice, guestName, guestEmail } = await req.json();

    // 1. Crear la reserva en estado "pending"
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      propertyId,
      propertyName,
      startDate,
      endDate,
      totalPrice,
      guestName,
      guestEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // 2. Crear la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Reserva: ${propertyName}`,
              description: `Del ${startDate} al ${endDate}`,
            },
            unit_amount: Math.round(totalPrice * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/properties/${propertyId}`,
      metadata: {
        bookingId: bookingRef.id, // CRÍTICO: Para que el webhook sepa qué reserva actualizar
      },
      customer_email: guestEmail,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error en Checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}