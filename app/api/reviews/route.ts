import { NextRequest, NextResponse } from 'next/server';

/**
 * Guest-submitted reviews are disabled. Curated reviews live in `property_reviews` (admin).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Las reseñas de huéspedes ya no están disponibles. Las reseñas se gestionan desde el panel de administración.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use property page curated reviews instead.' },
    { status: 410 }
  );
}
