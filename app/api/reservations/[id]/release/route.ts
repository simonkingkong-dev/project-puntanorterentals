import { NextRequest, NextResponse } from 'next/server';
import { releasePendingReservationAdmin } from '@/lib/firebase-admin-queries';

/**
 * POST /api/reservations/[id]/release
 * Libera una reserva pendiente (timer llegó a 0): cancela y vuelve a dejar las fechas disponibles.
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
    const released = await releasePendingReservationAdmin(id);
    if (!released) {
      return NextResponse.json({ error: 'Reserva no encontrada o no pendiente' }, { status: 404 });
    }
    return NextResponse.json({ released: true });
  } catch (error) {
    console.error('Error liberando reserva:', error);
    return NextResponse.json({ error: 'Error al liberar la reserva' }, { status: 500 });
  }
}
