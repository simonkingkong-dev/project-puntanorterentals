import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/reservations/[id]/status
 * Devuelve solo status y expiresAt (para el carrito: saber si puede ir al pago o a la propiedad).
 * No requiere cookie de cliente.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const snap = await adminDb.collection('reservations').doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }
    const data = snap.data()!;
    const status = data.status as string;
    const expiresAt = data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : undefined);
    const confirmedAt = data.confirmedAt?.toDate?.() ?? (data.confirmedAt ? new Date(data.confirmedAt) : undefined);
    const modifyToken = data.modifyToken as string | undefined;
    return NextResponse.json({
      status,
      expiresAt: expiresAt?.toISOString?.() ?? null,
      confirmedAt: confirmedAt?.toISOString?.() ?? null,
      modifyToken: modifyToken ?? null,
    });
  } catch (error) {
    console.error('Error fetching reservation status:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
