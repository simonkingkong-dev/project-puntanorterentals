import "server-only";
import { addDays } from "date-fns";
import { adminDb } from "@/lib/firebase-admin";
import { generateDateRange } from "@/lib/utils/date";
import { isMissingFirestoreIndexError } from "@/lib/firestore-query-utils";

/**
 * Noches ocupadas por una estancia: el check-out es exclusivo, así que el día de
 * salida no es una noche. Sin esto, el relevo el mismo día (uno sale, otro entra)
 * se detectaría como conflicto.
 */
function occupiedNights(checkIn: Date, checkOut: Date): string[] {
  const lastNight = addDays(checkOut, -1);
  if (lastNight < checkIn) return [];
  return generateDateRange(checkIn, lastNight);
}

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

/** Firestore limita `in` a 30 valores; los grupos de inventario son mucho menores. */
const IN_QUERY_LIMIT = 30;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

type DocLike = { id: string; data: () => FirebaseFirestore.DocumentData };

async function queryReservations(
  propertyIds: string[],
  status: "pending" | "confirmed",
  heldOnly: boolean
): Promise<DocLike[]> {
  const ids = Array.from(new Set(propertyIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const docs: DocLike[] = [];
  for (const group of chunk(ids, IN_QUERY_LIMIT)) {
    try {
      let q = adminDb
        .collection("reservations")
        .where("propertyId", "in", group)
        .where("status", "==", status);
      if (heldOnly) q = q.where("datesHeld", "==", true);
      const snap = await q.get();
      docs.push(...snap.docs);
    } catch (error) {
      if (!isMissingFirestoreIndexError(error)) throw error;
      const snap = await adminDb
        .collection("reservations")
        .where("propertyId", "in", group)
        .get();
      docs.push(
        ...snap.docs.filter((doc) => {
          const d = doc.data();
          if (d.status !== status) return false;
          return heldOnly ? d.datesHeld === true : true;
        })
      );
    }
  }
  return docs;
}

/**
 * True si otro huésped tiene un hold de pago activo (`datesHeld`) sobre noches que se solapan,
 * en cualquiera de las propiedades del grupo de inventario.
 *
 * `excludeClientToken` sólo debe usarse con la propiedad que el pagador está comprando: aplicarlo
 * al grupo permitiría a un mismo cliente retener la casa completa y comprar una unidad a la vez.
 */
export async function hasOverlappingActiveHold(
  propertyIds: string[],
  checkIn: Date,
  checkOut: Date,
  options?: HoldOverlapOptions
): Promise<boolean> {
  const now = new Date();
  const requestedDates = new Set(occupiedNights(checkIn, checkOut));
  const docs = await queryReservations(propertyIds, "pending", true);

  for (const doc of docs) {
    if (options?.excludeReservationId && doc.id === options.excludeReservationId) continue;

    const data = doc.data();
    if (options?.excludeClientToken && data.clientToken === options.excludeClientToken) continue;

    const expiresAt = data.expiresAt ? safeToDate(data.expiresAt) : null;
    if (expiresAt && expiresAt <= now) continue;

    const heldDates = occupiedNights(safeToDate(data.checkIn), safeToDate(data.checkOut));
    if (heldDates.some((d) => requestedDates.has(d))) return true;
  }

  return false;
}

/**
 * True si ya hay una reserva confirmada solapada en el grupo de inventario.
 *
 * Los llamadores posteriores al cobro DEBEN pasar `excludeReservationId`: si no, la reserva
 * recién confirmada se encuentra a sí misma y se cancelaría una estancia ya pagada.
 */
export async function hasOverlappingConfirmedReservation(
  propertyIds: string[],
  checkIn: Date,
  checkOut: Date,
  options?: { excludeReservationId?: string }
): Promise<boolean> {
  const requestedDates = new Set(occupiedNights(checkIn, checkOut));
  const docs = await queryReservations(propertyIds, "confirmed", false);

  for (const doc of docs) {
    if (options?.excludeReservationId && doc.id === options.excludeReservationId) continue;

    const data = doc.data();
    const bookedDates = occupiedNights(safeToDate(data.checkIn), safeToDate(data.checkOut));
    if (bookedDates.some((d) => requestedDates.has(d))) return true;
  }

  return false;
}
