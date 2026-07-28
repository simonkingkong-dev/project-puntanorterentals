"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Reservation } from "@/lib/types";
import { generateDateRange } from "@/lib/utils/date";
import { checkHostfullyAvailability } from "@/lib/hostfully/client";
import {
  hasOverlappingActiveHold,
  hasOverlappingConfirmedReservation,
} from "@/lib/availability-holds";
import { isMissingFirestoreIndexError } from "@/lib/firestore-query-utils";
import {
  getMinNights,
  validateMinNights,
  validateWebCheckInLeadTime,
} from "@/lib/booking-policy";
import { getBlockingPropertyIds, getCalendarGroupIds } from "@/lib/property-hierarchy";

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

async function getSameGuestPendingReservations(
  propertyId: string,
  existingClientToken: string
) {
  try {
    return await adminDb
      .collection("reservations")
      .where("propertyId", "==", propertyId)
      .where("status", "==", "pending")
      .where("clientToken", "==", existingClientToken)
      .get();
  } catch (error) {
    if (!isMissingFirestoreIndexError(error)) throw error;
    const snapshot = await adminDb
      .collection("reservations")
      .where("propertyId", "==", propertyId)
      .where("status", "==", "pending")
      .get();
    return {
      docs: snapshot.docs.filter((doc) => doc.data().clientToken === existingClientToken),
    };
  }
}

/** Libera reservas pendientes del mismo huésped (mismo clientToken) para la misma propiedad con fechas superpuestas. */
async function releaseSameGuestOverlappingPending(
  propertyId: string,
  newCheckIn: Date,
  newCheckOut: Date,
  existingClientToken: string
) {
  const { releasePendingReservationAdmin } = await import("@/lib/firebase-admin-queries");
  const snapshot = await getSameGuestPendingReservations(
    propertyId,
    existingClientToken
  );

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
async function getPendingHeldReservationsForProperty(propertyId: string) {
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

async function releaseExpiredHoldsForDates(propertyIds: string[], dateStrings: string[]) {
  const { releasePendingReservationAdmin } = await import("@/lib/firebase-admin-queries");
  const now = new Date();
  const dateSet = new Set(dateStrings);

  for (const propertyId of propertyIds) {
    const snapshot = await getPendingHeldReservationsForProperty(propertyId);

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
}

/**
 * Verifica si las fechas siguen disponibles para la propiedad (para proceder al pago).
 * - Si hay `hostfullyPropertyId`: consulta Hostfully en tiempo real.
 * - Si no hay hostfully id: usa Firestore + liberación de holds expirados.
 */
export type CheckPropertyAvailabilityOptions = {
  /** Excluye esta reserva del chequeo de holds (p. ej. la que está en página de pago). */
  excludeReservationId?: string;
  excludeClientToken?: string;
  /**
   * Aplica reglas de estancia (noches mínimas). Sólo antes del cobro.
   * Los llamadores posteriores al pago deben dejarlo en `false`: si el dueño sube el
   * mínimo mientras alguien paga, se cancelaría una estancia ya cobrada.
   */
  enforceStayRules?: boolean;
  /** Holds de pago de otros huéspedes. `false` tras el cobro (ya no compiten). */
  includePendingHolds?: boolean;
  /** Considerar el grupo padre/hijo. */
  includeRelatedProperties?: boolean;
};

/**
 * Verificación en vivo al reservar/pagar solamente.
 * Listados y calendario usan Firestore sincronizado por cron (~10 min).
 *
 * Falla cerrado: cualquier error (incluido Hostfully caído) devuelve no disponible.
 */
export async function checkPropertyAvailability(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  options?: CheckPropertyAvailabilityOptions
): Promise<{ available: boolean; error?: string }> {
  const {
    enforceStayRules = false,
    includePendingHolds = true,
    includeRelatedProperties = true,
  } = options ?? {};

  try {
    const { getPropertyByIdAdmin } = await import("@/lib/firebase-admin-queries");
    const property = await getPropertyByIdAdmin(propertyId);
    if (!property) return { available: false, error: "Propiedad no encontrada" };

    const leadTime = validateWebCheckInLeadTime(new Date(checkIn));
    if (!leadTime.allowed) {
      return { available: false, error: leadTime.error };
    }

    if (enforceStayRules) {
      const stay = validateMinNights(
        new Date(checkIn),
        new Date(checkOut),
        getMinNights(property)
      );
      if (!stay.allowed) return { available: false, error: stay.error };
    }

    // Reservas nuestras: bidireccional (una reserva nombra una sola propiedad).
    const blockingIds = includeRelatedProperties
      ? await getBlockingPropertyIds(propertyId)
      : [];
    const groupIds = Array.from(new Set([propertyId, ...blockingIds]));

    // Calendario Hostfully: sólo hacia arriba. El calendario del padre ya agrega a
    // sus hijas, así que heredarlo hacia abajo bloquearía habitaciones hermanas libres.
    const calendarIds = includeRelatedProperties
      ? await getCalendarGroupIds(propertyId)
      : [propertyId];

    const dateStrings = generateDateRange(new Date(checkIn), new Date(checkOut));
    await releaseExpiredHoldsForDates(groupIds, dateStrings);

    if (includePendingHolds) {
      // El token de cliente sólo exime en la propiedad que se está comprando; extenderlo
      // al grupo dejaría a un mismo cliente retener la casa y comprar una unidad a la vez.
      const ownHold = await hasOverlappingActiveHold(
        [propertyId],
        new Date(checkIn),
        new Date(checkOut),
        {
          excludeReservationId: options?.excludeReservationId,
          excludeClientToken: options?.excludeClientToken,
        }
      );
      const relatedHold =
        !ownHold && blockingIds.length > 0
          ? await hasOverlappingActiveHold(blockingIds, new Date(checkIn), new Date(checkOut), {
              excludeReservationId: options?.excludeReservationId,
            })
          : false;

      if (ownHold || relatedHold) {
        return {
          available: false,
          error: "Esas fechas están reservadas temporalmente por otro huésped en proceso de pago.",
        };
      }
    }

    const confirmedOverlap = await hasOverlappingConfirmedReservation(
      groupIds,
      new Date(checkIn),
      new Date(checkOut),
      { excludeReservationId: options?.excludeReservationId }
    );
    if (confirmedOverlap) {
      return { available: false, error: "Esas fechas ya están reservadas." };
    }

    const hostfullyChecks = await Promise.all(
      calendarIds.map(async (id) => {
        const prop = id === propertyId ? property : await getPropertyByIdAdmin(id);
        if (!prop?.hostfullyPropertyId) return null;
        return checkHostfullyAvailability(
          prop.hostfullyPropertyId,
          new Date(checkIn),
          new Date(checkOut)
        );
      })
    );
    for (const result of hostfullyChecks) {
      if (result && !result.available) return result;
    }

    // Propiedades sin vínculo al PMS: mapa local de disponibilidad.
    for (const id of calendarIds) {
      const prop = id === propertyId ? property : await getPropertyByIdAdmin(id);
      if (!prop || prop.hostfullyPropertyId) continue;
      const blocked = dateStrings.some((d) => prop.availability?.[d] === false);
      if (blocked) {
        const refreshed = await getPropertyByIdAdmin(id);
        if (!refreshed) return { available: false, error: "Propiedad no encontrada" };
        if (dateStrings.some((d) => refreshed.availability?.[d] === false)) {
          return { available: false };
        }
      }
    }

    return { available: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al verificar disponibilidad";
    return { available: false, error: msg };
  }
}