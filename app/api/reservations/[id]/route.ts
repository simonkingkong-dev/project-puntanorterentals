import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/reservations/[id]
 * Devuelve una reserva por ID solo si está en estado 'pending'.
 * Se puede pagar desde cualquier dispositivo; no se exige cookie de mismo navegador.
 * Incluye propertyTitle para la página de pago.
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
    const docRef = adminDb.collection('reservations').doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    const status = data.status as string;

    if (status !== 'pending') {
      return NextResponse.json({ error: 'Esta reserva ya no está pendiente de pago' }, { status: 404 });
    }

    let propertyTitle: string | undefined;
    let propertySlug: string | undefined;
    const propertyId = data.propertyId as string | undefined;
    if (propertyId) {
      const propSnap = await adminDb.collection('properties').doc(propertyId).get();
      if (propSnap.exists) {
        const propData = propSnap.data();
        propertyTitle = propData?.title as string;
        propertySlug = propData?.slug as string;
      }
    }

    const reservation = {
      id: snap.id,
      ...data,
      checkIn: data.checkIn?.toDate?.() ?? new Date(data.checkIn),
      checkOut: data.checkOut?.toDate?.() ?? new Date(data.checkOut),
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
      expiresAt: data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : undefined),
      propertyTitle,
      propertySlug,
    };

    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
