import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Rate limiting simple en memoria: IP -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 5;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) return true;
  if (now > entry.resetAt) {
    rateLimitMap.delete(ip);
    return true;
  }
  return entry.count < RATE_LIMIT_MAX_REQUESTS;
}

function incrementRateLimit(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count++;
  }
}

/**
 * GET /api/reservations/by-email?email=xxx&for=cart|reservations
 * - for=cart: reservas en hold (pending) o expiradas (pending con expiresAt pasado). Para recuperar carrito.
 * - for=reservations: solo confirmadas. Para "Mis reservas".
 * No incluye canceladas ni reservas pasadas.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento antes de intentar de nuevo.' },
      { status: 429 }
    );
  }
  incrementRateLimit(ip);

  const email = request.nextUrl.searchParams.get('email')?.trim()?.toLowerCase();
  const forParam = request.nextUrl.searchParams.get('for') || 'reservations';
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

      const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
      const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
      if (checkOut < today) continue;

      if (forParam === 'cart') {
        if (status !== 'pending') continue; // Solo hold y expiradas (ambas son pending en Firestore)
      } else {
        if (status !== 'confirmed') continue; // Solo confirmadas para Mis reservas
      }
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
