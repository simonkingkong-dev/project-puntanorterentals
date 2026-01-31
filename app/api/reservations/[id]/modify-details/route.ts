import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/reservations/[id]/modify-details?token=xxx
 * Devuelve reserva + propiedad para la página de modificación.
 * Solo si status === 'confirmed' y token coincide con modifyToken.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const token = request.nextUrl.searchParams.get('token');
  if (!id || !token?.trim()) {
    return NextResponse.json({ error: 'ID y token requeridos' }, { status: 400 });
  }

  try {
    const ref = adminDb.collection('reservations').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }
    const data = snap.data()!;
    if (data.status !== 'confirmed') {
      return NextResponse.json({ error: 'Solo se puede modificar una reserva confirmada' }, { status: 400 });
    }
    if ((data.modifyToken as string) !== token.trim()) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const reservation = {
      id: snap.id,
      propertyId: data.propertyId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      checkIn: data.checkIn?.toDate?.() ?? new Date(data.checkIn),
      checkOut: data.checkOut?.toDate?.() ?? new Date(data.checkOut),
      guests: data.guests ?? 1,
      totalAmount: data.totalAmount ?? 0,
      status: data.status,
      confirmedAt: data.confirmedAt?.toDate?.() ?? (data.confirmedAt ? new Date(data.confirmedAt) : undefined),
    };

    const propertyId = data.propertyId as string;
    const propSnap = await adminDb.collection('properties').doc(propertyId).get();
    if (!propSnap.exists) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }
    const propData = propSnap.data()!;
    const property = {
      id: propSnap.id,
      title: propData.title,
      description: propData.description ?? '',
      location: propData.location ?? '',
      slug: propData.slug,
      pricePerNight: propData.pricePerNight ?? 0,
      maxGuests: propData.maxGuests ?? 1,
      availability: (propData.availability as Record<string, boolean>) ?? {},
      images: propData.images ?? [],
      amenities: propData.amenities ?? [],
      featured: propData.featured ?? false,
      createdAt: propData.createdAt?.toDate?.() ?? new Date(),
      updatedAt: propData.updatedAt?.toDate?.() ?? new Date(),
    };

    return NextResponse.json({
      reservation: {
        ...reservation,
        checkIn: (reservation.checkIn as Date).toISOString(),
        checkOut: (reservation.checkOut as Date).toISOString(),
        confirmedAt: (reservation.confirmedAt as Date)?.toISOString?.() ?? null,
      },
      property,
    });
  } catch (error) {
    console.error('Error fetching modify details:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
