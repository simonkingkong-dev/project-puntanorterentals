import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * POST /api/reservations/[id]/extend
 * Añade 5 minutos al tiempo restante de una reserva pendiente, solo si:
 * - Quedan <= 5 minutos y
 * - Aún no se ha usado la prórroga (extendedOnce).
 * El tiempo total nunca supera 10 minutos desde ahora.
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
      return NextResponse.json({ error: 'Solo se puede extender una reserva pendiente' }, { status: 400 });
    }

    if (data.extendedOnce === true) {
      return NextResponse.json({ error: 'La prórroga ya fue usada' }, { status: 400 });
    }

    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();

    if (remainingMs > FIVE_MINUTES_MS) {
      return NextResponse.json(
        { error: 'Solo se puede extender cuando queden 5 minutos o menos' },
        { status: 400 }
      );
    }

    const newExpiresAtMs = Math.min(
      expiresAt.getTime() + FIVE_MINUTES_MS,
      now.getTime() + TEN_MINUTES_MS
    );
    const newExpiresAt = new Date(newExpiresAtMs);

    await ref.update({
      expiresAt: newExpiresAt,
      extendedOnce: true,
    });

    return NextResponse.json({ expiresAt: newExpiresAt.toISOString() });
  } catch (error) {
    console.error('Error extendiendo reserva:', error);
    return NextResponse.json({ error: 'Error al extender la reserva' }, { status: 500 });
  }
}
