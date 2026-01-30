import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Error de firma de Webhook: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Manejar el evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;

    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
          status: 'confirmed',
          stripeSessionId: session.id,
          paidAt: new Date().toISOString(),
        });
        console.log(`✅ Reserva ${bookingId} confirmada exitosamente.`);
      } catch (error) {
        console.error(`❌ Error actualizando Firestore para booking ${bookingId}:`, error);
        return new NextResponse('Error actualizando base de datos', { status: 500 });
      }
    }
  }

  return new NextResponse('Evento recibido', { status: 200 });
}