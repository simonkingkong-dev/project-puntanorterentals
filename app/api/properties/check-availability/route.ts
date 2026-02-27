import { NextRequest, NextResponse } from 'next/server';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';

/**
 * POST /api/properties/check-availability
 * Body: { propertyId: string, checkIn: string (ISO), checkOut: string (ISO) }
 * Returns: { available: boolean, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, checkIn, checkOut } = body;
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { available: false, error: 'propertyId, checkIn y checkOut son requeridos' },
        { status: 400 }
      );
    }
    const result = await checkPropertyAvailability(
      String(propertyId),
      new Date(checkIn),
      new Date(checkOut)
    );
    return NextResponse.json(result);
  } catch (e) {
    console.error('[check-availability]', e);
    return NextResponse.json(
      { available: false, error: 'Error al verificar disponibilidad' },
      { status: 500 }
    );
  }
}
