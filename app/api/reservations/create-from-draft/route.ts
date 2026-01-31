import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { releasePendingReservationAdmin } from '@/lib/firebase-admin-queries';

const PENDING_RESERVATION_MINUTES = 10;

/**
 * POST /api/reservations/create-from-draft
 * Crea la reserva al proceder al pago (desde borrador del carrito).
 * Límite: solo 1 reserva en hold activa por huésped; se liberan otras pendientes con temporizador activo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      propertyId,
      slug,
      checkIn,
      checkOut,
      guests = 1,
      guestName,
      guestEmail,
      guestPhone,
      totalAmount,
    } = body;

    if (!propertyId || !guestEmail || totalAmount == null) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios (propertyId, guestEmail, totalAmount)' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const email = String(guestEmail).trim().toLowerCase();

    // Liberar cualquier otra reserva en hold activa del mismo huésped (límite 1 en hold).
    const pendingSnapshot = await adminDb
      .collection('reservations')
      .where('guestEmail', '==', email)
      .where('status', '==', 'pending')
      .get();

    const now = new Date();
    for (const doc of pendingSnapshot.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
      if (expiresAt > now) {
        try {
          await releasePendingReservationAdmin(doc.id);
        } catch {
          // seguir con la creación
        }
      }
    }

    const expiresAt = new Date(Date.now() + PENDING_RESERVATION_MINUTES * 60 * 1000);
    const clientToken = crypto.randomUUID();

    const newReservation = {
      propertyId,
      guestName: guestName ?? '',
      guestEmail: email,
      guestPhone: guestPhone ?? '',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: Number(guests) || 1,
      totalAmount: Number(totalAmount) || 0,
      status: 'pending',
      createdAt: new Date(),
      expiresAt,
      clientToken,
    };

    const docRef = await adminDb.collection('reservations').add(newReservation);

    return NextResponse.json({
      reservationId: docRef.id,
      clientToken,
    });
  } catch (error) {
    console.error('Error create-from-draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al crear la reserva' },
      { status: 500 }
    );
  }
}
