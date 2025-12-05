// Archivo: app/api/reservations/by-payment-intent/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getReservationByPaymentIntentId } from '@/lib/firebase/reservations';

export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> } // CORREGIDO: params es una Promesa
) {
  // CORREGIDO: Esperamos la promesa antes de usar el ID
  const { id } = await context.params; 

  if (!id) {
    return NextResponse.json({ error: 'Payment Intent ID es requerido' }, { status: 400 });
  }

  try {
    const reservation = await getReservationByPaymentIntentId(id);

    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // Devolvemos la reservación completa
    return NextResponse.json(reservation);
    
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}