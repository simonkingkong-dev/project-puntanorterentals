import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  searchHostfullyLeads,
  type HostfullyLead,
} from "@/lib/hostfully/client";

function toOptionalString(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v.trim() ? v : undefined;
  const s = String(v);
  return s.trim() ? s : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) delete (obj as Record<string, unknown>)[k];
  }
  return obj;
}

function categorizeLead(lead: HostfullyLead): "quote" | "booking" {
  const type = (toOptionalString(lead.type) ??
    toOptionalString(lead.leadType) ??
    "") as string;
  const status = (toOptionalString(lead.status) ??
    toOptionalString(lead.bookingStatus) ??
    "") as string;

  const combined = `${type} ${status}`.toLowerCase();
  // Heurística: si refleja booking confirmado/BOOKED/CONFIRMED -> booking
  if (
    combined.includes("booked") ||
    combined.includes("confirmed") ||
    combined.includes("booking_confirm") ||
    combined.includes("bookingconfirmed")
  ) {
    return "booking";
  }

  // Si hay campos/keywords tipo solicitud/enquiry, cae a quote.
  if (
    combined.includes("request") ||
    combined.includes("inquiry") ||
    combined.includes("quote") ||
    combined.includes("booking") ||
    combined.includes("pending")
  ) {
    return "quote";
  }

  // Conservador: por default lo tratamos como cotización (intento)
  return "quote";
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agencyUid = toOptionalString(process.env.HOSTFULLY_AGENCY_UID);
    if (!agencyUid) {
      return NextResponse.json(
        { error: "HOSTFULLY_AGENCY_UID no configurada" },
        { status: 500 }
      );
    }

    const stateRef = adminDb.collection("hostfully_analytics_state").doc("state");
    const stateSnap = await stateRef.get();
    const stateData = stateSnap.exists ? stateSnap.data() : undefined;

    const fallbackLastSyncAt = new Date(Date.now() - 60 * 60 * 1000); // fallback: 1h atrás
    const lastSyncAt: Date = (() => {
      const v = stateData?.lastSyncAt;
      if (v instanceof Date) return v;
      // Soportar Timestamp de Firestore (tiene `toDate()`)
      if (v && typeof v === "object" && "toDate" in v) {
        const maybeTs = v as { toDate?: () => unknown };
        const d = maybeTs.toDate?.();
        if (d instanceof Date) return d;
        const parsed = new Date(d as string | number);
        return Number.isFinite(parsed.getTime()) ? parsed : fallbackLastSyncAt;
      }
      if (v != null) {
        const parsed = new Date(v as string | number);
        return Number.isFinite(parsed.getTime()) ? parsed : fallbackLastSyncAt;
      }
      return fallbackLastSyncAt;
    })();

    const now = new Date();

    let leads: HostfullyLead[] = [];
    try {
      // Intento con ventana temporal (si la API lo soporta)
      leads = await searchHostfullyLeads({
        agencyUid,
        createdFrom: lastSyncAt.toISOString(),
        createdTo: now.toISOString(),
      });
    } catch {
      // Fallback: consulta sin ventana temporal
      leads = await searchHostfullyLeads({ agencyUid });
    }

    const batch = adminDb.batch();
    let wrote = 0;
    let skipped = 0;
    let bookings = 0;
    let quotes = 0;

    // Firestore: batching safe-ish cap
    const MAX_WRITES = 450;

    for (const lead of leads) {
      if (wrote >= MAX_WRITES) break;

      const leadUid = toOptionalString(
        lead.leadUid ?? lead.uid ?? (lead as Record<string, unknown>).id
      );
      if (!leadUid) {
        skipped++;
        continue;
      }

      const propertyUid = toOptionalString(
        lead.propertyUid ?? (lead as Record<string, unknown>).property_id
      );

      const status = toOptionalString(lead.status ?? lead.bookingStatus);
      const type = toOptionalString(lead.type ?? lead.leadType);

      const category = categorizeLead(lead);
      if (category === "booking") bookings++;
      else quotes++;

      const collectionName =
        category === "booking"
          ? "hostfully_analytics_bookings"
          : "hostfully_analytics_quotes";

      // Deduplicación por leadUid + categoría
      const docId = `${leadUid}-${category}`;

      const createdAt = toOptionalString(
        lead.createdAt ?? (lead as Record<string, unknown>).created_at
      );
      const updatedAt = toOptionalString(
        lead.updatedAt ?? (lead as Record<string, unknown>).updated_at
      );

      const payload = stripUndefined({
        leadUid,
        propertyUid,
        agencyUid,
        eventCategory: category,
        type,
        status,
        createdAt,
        updatedAt,
        checkIn: toOptionalString(lead.checkIn),
        checkOut: toOptionalString(lead.checkOut),
        guestEmail: toOptionalString(lead.guestEmail),
        guestName: toOptionalString(lead.guestName),
        // Para depuración futura sin guardar todo el objeto completo.
        hostfullySource: "polling:GET /leads",
        ingestedAt: now,
      });

      batch.set(adminDb.collection(collectionName).doc(docId), payload, {
        merge: true,
      });
      wrote++;
    }

    // Commit + cursor update
    await batch.commit();
    await stateRef.set(
      stripUndefined({ lastSyncAt: now, updatedAt: now }),
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      lastSyncAt,
      now,
      totalLeadsReturned: leads.length,
      wrote,
      skipped,
      quotes,
      bookings,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

