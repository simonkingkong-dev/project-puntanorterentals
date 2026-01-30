import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Reservation } from '@/lib/types';

/**
 * GET /api/reservations/[id]
 * Devuelve una reserva por ID solo si está en estado 'pending'.
 * Usado por la página de pago para obtener totalAmount y mostrar el resumen.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const docRef = adminDb.collection('reservations').doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    const status = data.status as string;

    // Solo permitir consultar reservas pendientes de pago (para la página de pago)
    if (status !== 'pending') {
      return NextResponse.json({ error: 'Esta reserva ya no está pendiente de pago' }, { status: 404 });
    }

    const reservation: Reservation = {
      id: snap.id,
      ...data,
      checkIn: data.checkIn?.toDate?.() ?? new Date(data.checkIn),
      checkOut: data.checkOut?.toDate?.() ?? new Date(data.checkOut),
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    } as Reservation;

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
