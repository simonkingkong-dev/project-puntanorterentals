import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/reservations/by-property-dates?propertyId=xxx&checkIn=xxx&checkOut=xxx
 * Devuelve una reserva (si existe) para esa propiedad con fechas que se superponen.
 * Sirve para que el carrito sin reservationId pueda "enlazar" a la reserva y mostrar el estado (confirmada/pending).
 */
export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.trim();
  const checkInParam = request.nextUrl.searchParams.get('checkIn')?.trim();
  const checkOutParam = request.nextUrl.searchParams.get('checkOut')?.trim();

  if (!propertyId || !checkInParam || !checkOutParam) {
    return NextResponse.json({ error: 'propertyId, checkIn y checkOut requeridos' }, { status: 400 });
  }

  const checkIn = new Date(checkInParam);
  const checkOut = new Date(checkOutParam);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 });
  }

  try {
    const snapshot = await adminDb
      .collection('reservations')
      .where('propertyId', '==', propertyId)
      .where('status', 'in', ['pending', 'confirmed'])
      .limit(10)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const resCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
      const resCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
      const overlaps =
        checkIn.getTime() < resCheckOut.getTime() && resCheckIn.getTime() < checkOut.getTime();
      if (overlaps) {
        return NextResponse.json({
          reservationId: doc.id,
          status: data.status ?? 'pending',
        });
      }
    }

    return NextResponse.json({ reservationId: null, status: null });
  } catch (error) {
    console.error('Error buscando reserva por propiedad y fechas:', error);
    return NextResponse.json({ error: 'Error al buscar reserva' }, { status: 500 });
  }
}
