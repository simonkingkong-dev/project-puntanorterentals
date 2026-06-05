import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/admin/revalidate-properties
 * Invalida la caché de fichas públicas tras actualizar textos en Firestore.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("properties").get();
  const slugs: string[] = [];

  revalidateTag("properties", "max");
  revalidatePath("/properties");
  for (const doc of snap.docs) {
    const slug = doc.data()?.slug as string | undefined;
    if (slug?.trim()) {
      revalidateTag(`property:${slug}`, "max");
      revalidatePath(`/properties/${slug}`);
      slugs.push(slug);
    }
  }

  return NextResponse.json({
    ok: true,
    revalidated: slugs.length,
    slugs,
  });
}
