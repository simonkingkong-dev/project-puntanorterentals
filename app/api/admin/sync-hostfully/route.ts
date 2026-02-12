import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/admin/admin";
import { syncHostfullyProperties } from "@/app/admin/properties/sync-hostfully/actions";

/**
 * POST /api/admin/sync-hostfully
 * Ejecuta la sincronización de propiedades desde Hostfully.
 * Requiere sesión de admin.
 */
export async function POST() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await syncHostfullyProperties();
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Error al sincronizar" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    created: result.created,
    updated: result.updated,
  });
}
