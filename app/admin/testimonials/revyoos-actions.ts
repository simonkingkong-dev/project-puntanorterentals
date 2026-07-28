"use server";

import { revalidatePath } from "next/cache";
import { syncRevyoosReviews, type RevyoosSyncResult } from "@/lib/revyoos/sync";

export async function syncRevyoosReviewsAction(): Promise<
  { success: true; result: RevyoosSyncResult } | { success: false; error: string }
> {
  try {
    const result = await syncRevyoosReviews();
    revalidatePath("/admin/testimonials");
    revalidatePath("/admin/properties");
    return { success: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al sincronizar Revyoos";
    return { success: false, error: message };
  }
}
