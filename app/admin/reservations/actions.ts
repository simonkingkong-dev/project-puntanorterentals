"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { Reservation } from "@/lib/types";
import { generateDateRange } from "@/lib/utils/date";
import {
  updatePropertyAvailabilityAdmin,
  releasePendingReservationAdmin,
} from "@/lib/firebase-admin-queries";

/** Cancela una reserva. Si tenía fechas en hold o estaba confirmada, libera las fechas. */
export async function cancelReservationAdmin(reservationId: string) {
  if (!reservationId) return { success: false, error: "ID requerido" };
  try {
    const ref = adminDb.collection("reservations").doc(reservationId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: "Reserva no encontrada" };
    const data = snap.data()!;
    const status = data.status as string;
    if (status === "cancelled") {
      revalidatePath("/admin/reservations");
      return { success: true };
    }
    const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const propertyId = data.propertyId as string;
    const datesHeld = data.datesHeld === true;
    const dateStrings = generateDateRange(checkIn, checkOut);

    await ref.update({ status: "cancelled", updatedAt: new Date() });
    if (status === "confirmed" || datesHeld) {
      await updatePropertyAvailabilityAdmin(propertyId, dateStrings, true);
    }
    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (error) {
    console.error("Error cancelando reserva:", error);
    return { success: false, error: "Error al cancelar la reserva." };
  }
}

/** Confirma una reserva pendiente: bloquea las fechas primero, luego pone status confirmed, confirmedAt y modifyToken (para que el cliente vea Confirmada y pueda modificar). */
export async function confirmReservationAdmin(reservationId: string) {
  if (!reservationId) return { success: false, error: "ID requerido" };
  try {
    const ref = adminDb.collection("reservations").doc(reservationId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: "Reserva no encontrada" };
    const data = snap.data()!;
    if (data.status !== "pending") {
      return { success: false, error: "Solo se pueden confirmar reservas pendientes." };
    }
    const checkIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const checkOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const propertyId = data.propertyId as string;
    const dateStrings = generateDateRange(checkIn, checkOut);

    await updatePropertyAvailabilityAdmin(propertyId, dateStrings, false);
    const confirmedAt = new Date();
    const modifyToken = crypto.randomUUID();
    await ref.update({
      status: "confirmed",
      confirmedAt,
      modifyToken,
      updatedAt: new Date(),
    });
    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (error) {
    console.error("Error confirmando reserva:", error);
    return { success: false, error: "Error al confirmar la reserva." };
  }
}

export type UpdateReservationFormData = Partial<
  Pick<
    Reservation,
    | "guestName"
    | "guestEmail"
    | "guestPhone"
    | "checkIn"
    | "checkOut"
    | "guests"
    | "totalAmount"
  >
>;

/** Actualiza una reserva. Si está confirmada y cambian las fechas, actualiza disponibilidad. */
export async function updateReservationAdmin(
  reservationId: string,
  formData: UpdateReservationFormData
) {
  if (!reservationId) return { success: false, error: "ID requerido" };
  try {
    const ref = adminDb.collection("reservations").doc(reservationId);
    const snap = await ref.get();
    if (!snap.exists) return { success: false, error: "Reserva no encontrada" };
    const data = snap.data()!;
    const oldCheckIn = data.checkIn?.toDate?.() ?? new Date(data.checkIn);
    const oldCheckOut = data.checkOut?.toDate?.() ?? new Date(data.checkOut);
    const propertyId = data.propertyId as string;
    const status = data.status as string;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (formData.guestName !== undefined) updates.guestName = formData.guestName;
    if (formData.guestEmail !== undefined) updates.guestEmail = formData.guestEmail;
    if (formData.guestPhone !== undefined) updates.guestPhone = formData.guestPhone;
    if (formData.guests !== undefined) updates.guests = formData.guests;
    if (formData.totalAmount !== undefined) updates.totalAmount = formData.totalAmount;
    const newCheckIn = formData.checkIn != null
      ? new Date(formData.checkIn as string | Date)
      : oldCheckIn;
    const newCheckOut = formData.checkOut != null
      ? new Date(formData.checkOut as string | Date)
      : oldCheckOut;
    updates.checkIn = newCheckIn;
    updates.checkOut = newCheckOut;

    if (status === "confirmed") {
      const oldDates = generateDateRange(oldCheckIn, oldCheckOut);
      const newDates = generateDateRange(newCheckIn, newCheckOut);
      await updatePropertyAvailabilityAdmin(propertyId, oldDates, true);
      await updatePropertyAvailabilityAdmin(propertyId, newDates, false);
    }

    await ref.update(updates);
    revalidatePath("/admin/reservations");
    revalidatePath(`/admin/reservations/${reservationId}/edit`);
  } catch (error) {
    console.error("Error actualizando reserva:", error);
    return { success: false, error: "Error al actualizar la reserva." };
  }
  redirect("/admin/reservations");
}

export type CreateReservationAdminInput = Pick<
  Reservation,
  | "propertyId"
  | "guestName"
  | "guestEmail"
  | "guestPhone"
  | "checkIn"
  | "checkOut"
  | "guests"
  | "totalAmount"
> & { status?: "pending" | "confirmed" };

/** Crea una reserva desde el panel admin. Si status === 'confirmed', bloquea las fechas. */
export async function createReservationAdmin(
  input: CreateReservationAdminInput
) {
  try {
    const status = input.status ?? "pending";
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    const newReservation = {
      propertyId: input.propertyId,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      checkIn,
      checkOut,
      guests: input.guests,
      totalAmount: input.totalAmount,
      status,
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection("reservations").add(newReservation);
    if (status === "confirmed") {
      const dateStrings = generateDateRange(checkIn, checkOut);
      await updatePropertyAvailabilityAdmin(
        input.propertyId,
        dateStrings,
        false
      );
    }
    revalidatePath("/admin/reservations");
  } catch (error) {
    console.error("Error creando reserva:", error);
    return { success: false, error: "Error al crear la reserva." };
  }
  redirect("/admin/reservations");
}
