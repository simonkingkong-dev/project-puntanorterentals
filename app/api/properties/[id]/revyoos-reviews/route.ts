import { NextRequest, NextResponse } from "next/server";
import { getRevyoosReviewsForPropertyAdmin } from "@/lib/firebase-admin-queries";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;

/**
 * GET /api/properties/[id]/revyoos-reviews?offset=9&limit=9
 * Página siguiente de reseñas Revyoos para "Cargar más" en el cliente.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT));

  try {
    const { reviews, total } = await getRevyoosReviewsForPropertyAdmin(id, { offset, limit });
    return NextResponse.json({ reviews, total });
  } catch (e) {
    console.error("[revyoos-reviews]", e);
    return NextResponse.json({ error: "Error al cargar reseñas" }, { status: 500 });
  }
}
