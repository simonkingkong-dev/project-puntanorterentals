"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Reservation } from "@/lib/types";
import { generateDateRange } from "@/lib/utils/date";

const PENDING_RESERVATION_MINUTES = 10;

/** Datos que el formulario envía; el servidor genera id, status, createdAt, stripePaymentId, expiresAt, clientToken, datesHeld */
export type CreateReservationInput = Omit<
  Reservation,
  'id' | 'createdAt' | 'status' | 'stripePaymentId' | 'expiresAt' | 'clientToken' | 'datesHeld'
>;

/** Parámetro adicional: token del cliente desde la cookie (mismo huésped). Si hay reserva pendiente del mismo huésped con fechas superpuestas, se libera antes de crear la nueva. */
export type CreateReservationOptions = CreateReservationInput & { existingClientToken?: string };

function dateRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** Libera reservas pendientes del mismo huésped (mismo clientToken) para la misma propiedad con fechas superpuestas. */
async function releaseSameGuestOverlappingPending(
  propertyId: string,
  newCheckIn: Date,
  newCheckOut: Date,
  existingClientToken: string
) {
  const { releasePendingReservationAdmin } = await import("@/lib/firebase-admin-queries");
  const snapshot = await adminDb
    .collection("reservations")
    .where("propertyId", "==", propertyId)
    .where("status", "==", "pending")
    .where("clientToken", "==", existingClientToken)
    .get();

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const resCheckIn = d.checkIn?.toDate?.() ?? new Date(d.checkIn);
    const resCheckOut = d.checkOut?.toDate?.() ?? new Date(d.checkOut);
    if (dateRangesOverlap(newCheckIn, newCheckOut, resCheckIn, resCheckOut)) {
      try {
        await releasePendingReservationAdmin(doc.id);
      } catch {
        // ignore per-reservation
      }
    }
  }
}

export async function handleCreatePublicReservation(
  options: CreateReservationOptions
) {
  const { existingClientToken, ...data } = options;
  try {
    if (!data.propertyId || !data.guestEmail || !data.totalAmount) {
      throw new Error("Faltan datos obligatorios para la reserva");
    }

    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);

    if (existingClientToken?.trim()) {
      await releaseSameGuestOverlappingPending(
        data.propertyId,
        checkIn,
        checkOut,
        existingClientToken.trim()
      );
    }

    const expiresAt = new Date(Date.now() + PENDING_RESERVATION_MINUTES * 60 * 1000);
    const clientToken = crypto.randomUUID();

    const newReservation = {
      ...data,
      status: 'pending',
      createdAt: new Date(),
      checkIn,
      checkOut,
      expiresAt,
      clientToken,
    };

    const docRef = await adminDb.collection('reservations').add(newReservation);

    return { success: true, reservationId: docRef.id, clientToken };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar la reserva";
    if (process.env.NODE_ENV === 'development') {
      console.error("[handleCreatePublicReservation]", error);
    }
    return { success: false, error: message };
  }
}

/** Libera reservas pendientes expiradas que tenían las fechas bloqueadas (hold), para que las fechas queden libres de nuevo. */
async function releaseExpiredHoldsForDates(propertyId: string, dateStrings: string[]) {
  const { getPropertyByIdAdmin, releasePendingReservationAdmin } = await import("@/lib/firebase-admin-queries");
  const now = new Date();
  const dateSet = new Set(dateStrings);
  const snapshot = await adminDb
    .collection("reservations")
    .where("propertyId", "==", propertyId)
    .where("status", "==", "pending")
    .where("datesHeld", "==", true)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt);
    if (expiresAt >= now) continue;
    const resCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const resCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const resDates = generateDateRange(resCheckIn, resCheckOut);
    const overlaps = resDates.some((d) => dateSet.has(d));
    if (overlaps) {
      try {
        await releasePendingReservationAdmin(doc.id);
      } catch {
        // ignore per-reservation errors
      }
    }
  }
}

/** Verifica si las fechas siguen disponibles para la propiedad (para proceder al pago).
 * Si la propiedad tiene hostfullyPropertyId, consulta disponibilidad al PMS (Hostfully).
 * Si no, usa Firestore (availability + release de holds expirados).
 */
export async function checkPropertyAvailability(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ available: boolean; error?: string }> {
  try {
    const { getPropertyByIdAdmin } = await import("@/lib/firebase-admin-queries");
    const property = await getPropertyByIdAdmin(propertyId);
    if (!property) return { available: false, error: "Propiedad no encontrada" };

    // Prioridad 1: Hostfully (PMS) si la propiedad está vinculada
    if (property.hostfullyPropertyId) {
      const { checkHostfullyAvailability } = await import("@/lib/hostfully/client");
      return checkHostfullyAvailability(
        property.hostfullyPropertyId,
        new Date(checkIn),
        new Date(checkOut)
      );
    }

    // Prioridad 2: Firestore
    const dateStrings = generateDateRange(new Date(checkIn), new Date(checkOut));
    let prop = property;
    const hasUnavailable = dateStrings.some((d) => prop.availability[d] === false);
    if (hasUnavailable) {
      await releaseExpiredHoldsForDates(propertyId, dateStrings);
      const refreshed = await getPropertyByIdAdmin(propertyId);
      if (!refreshed) return { available: false, error: "Propiedad no encontrada" };
      prop = refreshed;
    }

    for (const d of dateStrings) {
      if (prop.availability[d] === false) return { available: false };
    }
    return { available: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al verificar disponibilidad";
    return { available: false, error: msg };
  }
}