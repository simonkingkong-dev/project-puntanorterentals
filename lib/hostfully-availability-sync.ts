import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { getPropertyCalendar } from "@/lib/hostfully/client";
import { parseHostfullyCalendarResponse } from "@/lib/hostfully-calendar-sync";

const MONTHS_AHEAD = 24;
const SYNC_STATE_DOC = "hostfully_sync_state/availability";

/** Intervalo entre pulls a Hostfully (minutos). Default: 20. */
export const HOSTFULLY_AVAILABILITY_TTL_MS =
  (Number(process.env.HOSTFULLY_AVAILABILITY_TTL_MINUTES) || 20) * 60 * 1000;

export type HostfullyAvailabilitySyncResult = {
  updated: number;
  total: number;
  errors?: string[];
};

function safeTimestampToDate(value: unknown): Date {
  if (value == null) return new Date(0);
  const v = value as { toDate?: () => Date };
  if (typeof v.toDate === "function") return v.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date(0) : d;
  }
  return new Date(0);
}

export function isAvailabilityCacheStale(syncedAt: unknown): boolean {
  if (syncedAt == null) return true;
  return Date.now() - safeTimestampToDate(syncedAt).getTime() >= HOSTFULLY_AVAILABILITY_TTL_MS;
}

function getCalendarDateRange(): { startStr: string; endStr: string } {
  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + MONTHS_AHEAD);
  const startStr =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");
  const endStr =
    end.getFullYear() +
    "-" +
    String(end.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(end.getDate()).padStart(2, "0");
  return { startStr, endStr };
}

let allPropertiesSyncPromise: Promise<HostfullyAvailabilitySyncResult> | null = null;
const propertySyncPromises = new Map<string, Promise<void>>();

/** Pull de Hostfully → Firestore para una propiedad. */
export async function syncPropertyAvailabilityFromHostfully(
  propertyDocId: string,
  hostfullyPropertyUid: string
): Promise<void> {
  const { startStr, endStr } = getCalendarDateRange();
  const calendar = await getPropertyCalendar(hostfullyPropertyUid, startStr, endStr);
  const { availability } = parseHostfullyCalendarResponse(calendar as Record<string, unknown>);

  await adminDb.collection("properties").doc(propertyDocId).update({
    availability,
    availabilitySyncedAt: new Date(),
    updatedAt: new Date(),
  });
}

/** Pull de Hostfully → Firestore para todas las propiedades vinculadas. */
export async function syncAllPropertiesAvailabilityFromHostfully(): Promise<HostfullyAvailabilitySyncResult> {
  if (process.env.HOSTFULLY_PERSIST_AVAILABILITY === "false") {
    return { updated: 0, total: 0, errors: ["HOSTFULLY_PERSIST_AVAILABILITY=false"] };
  }

  const { startStr, endStr } = getCalendarDateRange();
  const snapshot = await adminDb.collection("properties").get();
  const docs = snapshot.docs.filter(
    (d) =>
      d.data().hostfullyPropertyId != null &&
      String(d.data().hostfullyPropertyId).trim() !== ""
  );

  let updated = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    const uid = String(doc.data().hostfullyPropertyId).trim();
    if (!uid) continue;
    try {
      const calendar = await getPropertyCalendar(uid, startStr, endStr);
      const { availability } = parseHostfullyCalendarResponse(calendar as Record<string, unknown>);
      await doc.ref.update({
        availability,
        availabilitySyncedAt: new Date(),
        updatedAt: new Date(),
      });
      updated++;
    } catch (e) {
      errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await adminDb.doc(SYNC_STATE_DOC).set({ lastSyncedAt: new Date() }, { merge: true });

  return {
    updated,
    total: docs.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Si la caché de esta propiedad tiene más de ~20 min (o está vacía), llama a Hostfully y guarda en Firestore.
 */
export async function ensurePropertyAvailabilityFresh(
  propertyId: string
): Promise<"hostfully" | "cache"> {
  if (process.env.HOSTFULLY_PERSIST_AVAILABILITY === "false") {
    return "cache";
  }

  const snap = await adminDb.collection("properties").doc(propertyId).get();
  if (!snap.exists) return "cache";

  const data = snap.data()!;
  const hostfullyUid = String(data.hostfullyPropertyId ?? "").trim();
  if (!hostfullyUid) return "cache";

  const availability = data.availability as Record<string, boolean> | undefined;
  const hasAvailability =
    availability != null && Object.keys(availability).some((k) => availability[k] === false || availability[k] === true);

  if (!isAvailabilityCacheStale(data.availabilitySyncedAt) && hasAvailability) {
    return "cache";
  }

  const inFlight = propertySyncPromises.get(propertyId);
  if (inFlight) {
    await inFlight;
    return "hostfully";
  }

  const syncPromise = syncPropertyAvailabilityFromHostfully(propertyId, hostfullyUid)
    .catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[ensurePropertyAvailabilityFresh]", propertyId, e);
      }
      throw e;
    })
    .finally(() => {
      propertySyncPromises.delete(propertyId);
    });

  propertySyncPromises.set(propertyId, syncPromise);
  await syncPromise;
  return "hostfully";
}

/**
 * Para búsqueda con fechas: refresca todas las propiedades desde Hostfully si pasaron ~20 min.
 */
export async function ensureAllPropertiesAvailabilityFresh(): Promise<"hostfully" | "cache"> {
  if (process.env.HOSTFULLY_PERSIST_AVAILABILITY === "false") {
    return "cache";
  }

  const metaSnap = await adminDb.doc(SYNC_STATE_DOC).get();
  const lastSyncedAt = metaSnap.data()?.lastSyncedAt;

  if (!isAvailabilityCacheStale(lastSyncedAt)) {
    return "cache";
  }

  if (allPropertiesSyncPromise) {
    await allPropertiesSyncPromise;
    return "hostfully";
  }

  allPropertiesSyncPromise = syncAllPropertiesAvailabilityFromHostfully()
    .catch((e) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[ensureAllPropertiesAvailabilityFresh]", e);
      }
      throw e;
    })
    .finally(() => {
      allPropertiesSyncPromise = null;
    });

  await allPropertiesSyncPromise;
  return "hostfully";
}
