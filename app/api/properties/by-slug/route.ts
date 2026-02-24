import { NextResponse } from 'next/server';
import { getPropertyBySlugAdmin } from '@/lib/firebase-admin-queries';

/**
 * GET /api/properties/by-slug?slug=xxx
 * Returns a single property by slug (Admin SDK). Use from client instead of Firestore client to avoid permission errors.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }
  const property = await getPropertyBySlugAdmin(slug);
  if (!property) {
    return NextResponse.json({ property: null }, { status: 404 });
  }
  return NextResponse.json({ property });
}
