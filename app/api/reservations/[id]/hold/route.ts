import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
/**
 * POST /api/reservations/[id]/hold
 * Marca la reserva como "en pago" (datesHeld) sin escribir en property.availability.
 * La disponibilidad visible sigue viniendo del cron Hostfully; la corroboración en vivo es al pagar.
 * Idempotente: si ya tenía datesHeld, no hace nada.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const ref = adminDb.collection('reservations').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden bloquear fechas de reservas pendientes' }, { status: 400 });
    }

    if (data.datesHeld === true) {
      return NextResponse.json({ held: true, alreadyHeld: true });
    }

    await ref.update({ datesHeld: true });

    return NextResponse.json({ held: true });
  } catch (error) {
    console.error('Error en hold de reserva:', error);
    return NextResponse.json({ error: 'Error al bloquear fechas' }, { status: 500 });
  }
}
