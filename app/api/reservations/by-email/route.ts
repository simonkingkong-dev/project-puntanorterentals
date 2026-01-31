import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/reservations/by-email?email=xxx
 * Devuelve reservas activas (confirmadas, en hold o expiradas) y futuras del huésped con ese email.
 * No incluye canceladas ni reservas pasadas. Usado para recuperar el carrito cuando el cliente limpia cookies.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim()?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection('reservations')
      .where('guestEmail', '==', email)
      .limit(50)
      .get();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations: Array<{
      id: string;
      propertyId: string;
      propertySlug?: string;
      propertyTitle?: string;
      checkIn: string;
      checkOut: string;
      guests: number;
      totalAmount: number;
      status: string;
      expiresAt: string | null;
      confirmedAt: string | null;
      modifyToken: string | null;
    }> = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const status = (data.status as string) ?? 'pending';
      if (status === 'cancelled') continue;
      if (status !== 'confirmed' && status !== 'pending') continue;

      const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
      const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
      if (checkOut < today) continue;
      const expiresAt = data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : null);
      const confirmedAt = data.confirmedAt?.toDate?.() ?? (data.confirmedAt ? new Date(data.confirmedAt) : null);

      let propertySlug: string | undefined;
      let propertyTitle: string | undefined;
      const propertyId = data.propertyId as string;
      if (propertyId) {
        const propSnap = await adminDb.collection('properties').doc(propertyId).get();
        if (propSnap.exists) {
          const p = propSnap.data();
          propertySlug = p?.slug as string | undefined;
          propertyTitle = p?.title as string | undefined;
        }
      }

      reservations.push({
        id: doc.id,
        propertyId,
        propertySlug,
        propertyTitle,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests: (data.guests as number) ?? 1,
        totalAmount: (data.totalAmount as number) ?? 0,
        status,
        expiresAt: expiresAt?.toISOString?.() ?? null,
        confirmedAt: confirmedAt?.toISOString?.() ?? null,
        modifyToken: (data.modifyToken as string) ?? null,
      });
    }

    reservations.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());

    return NextResponse.json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations by email:', error);
    return NextResponse.json({ error: 'Error al buscar reservas' }, { status: 500 });
  }
}
