// Archivo: app/api/reservations/by-payment-intent/[id]/route.ts

import { NextResponse } from 'next/server';
import { getReservationByPaymentIntentId } from '@/lib/firebase/reservations';

interface Params {
  params: { id: string };
}

export async function GET(request: Request, { params }: Params) {
  const { id } = params; // Este es el payment_intent_id

  if (!id) {
    return NextResponse.json({ error: 'Payment Intent ID es requerido' }, { status: 400 });
  }

  try {
    const reservation = await getReservationByPaymentIntentId(id);

    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}