// Archivo: app/api/reservations/by-payment-intent/[id]/route.ts (Corregido)

import { NextRequest, NextResponse } from 'next/server';
import { getReservationByPaymentIntentId } from '@/lib/firebase/reservations';
import { Reservation } from '@/lib/types';

// CORREGIDO: Eliminamos la 'interface RouteContext' separada
// y tipamos 'context' directamente en la función.

export async function GET(
  request: NextRequest, 
  context: { params: { id: string } } // Esta es la forma estándar
) {
  const { id } = context.params; // Obtenemos 'id' desde 'context.params'

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