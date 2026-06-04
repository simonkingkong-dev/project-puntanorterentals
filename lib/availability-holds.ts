import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { generateDateRange } from "@/lib/utils/date";
import { isMissingFirestoreIndexError } from "@/lib/firestore-query-utils";

function safeToDate(value: unknown): Date {
  if (value == null) return new Date(0);
  const v = value as { toDate?: () => Date };
  if (typeof v.toDate === "function") return v.toDate();
  if (value instanceof Date) return value;
  return new Date(String(value));
}

export type HoldOverlapOptions = {
  excludeReservationId?: string;
  excludeClientToken?: string;
};

async function getPendingHeldReservations(propertyId: string) {
  try {
    return await adminDb
      .collection("reservations")
      .where("propertyId", "==", propertyId)
      .where("status", "==", "pending")
      .where("datesHeld", "==", true)
      .get();
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) throw error;
    const snapshot = await adminDb
      .collection("reservations")
      .where("propertyId", "==", propertyId)
      .where("status", "==", "pending")
      .get();
    return {
      docs: snapshot.docs.filter((doc) => doc.data().datesHeld === true),
    };
  }
}

/**
 * True if another guest has an active payment hold (datesHeld) on overlapping nights.
 * Own cart/reservation can be excluded so holds do not block the payer's verification.
 */
export async function hasOverlappingActiveHold(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  options?: HoldOverlapOptions
): Promise<boolean> {
  const now = new Date();
  const requestedDates = new Set(generateDateRange(checkIn, checkOut));

  const snapshot = await getPendingHeldReservations(propertyId);

  for (const doc of snapshot.docs) {
    if (options?.excludeReservationId && doc.id === options.excludeReservationId) continue;

    const data = doc.data();
    if (options?.excludeClientToken && data.clientToken === options.excludeClientToken) continue;

    const expiresAt = data.expiresAt ? safeToDate(data.expiresAt) : null;
    if (expiresAt && expiresAt <= now) continue;

    const resCheckIn = safeToDate(data.checkIn);
    const resCheckOut = safeToDate(data.checkOut);
    const heldDates = generateDateRange(resCheckIn, resCheckOut);
    if (heldDates.some((d) => requestedDates.has(d))) return true;
  }

  return false;
}
