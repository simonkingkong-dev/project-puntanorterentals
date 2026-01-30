"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Reservation } from "@/lib/types";

/** Datos que el formulario envía; el servidor genera id, status, createdAt, stripePaymentId */
export type CreateReservationInput = Omit<
  Reservation,
  'id' | 'createdAt' | 'status' | 'stripePaymentId'
>;

export async function handleCreatePublicReservation(data: CreateReservationInput) {
  try {
    // 1. Validar datos básicos (opcional pero recomendado)
    if (!data.propertyId || !data.guestEmail || !data.totalAmount) {
      throw new Error("Faltan datos obligatorios para la reserva");
    }

    // 2. Preparar el objeto para Firestore
    // Convertimos las fechas a objetos Date nativos si vienen como strings, 
    // aunque desde el componente ya deberían ser Date.
    const newReservation = {
      ...data,
      status: 'pending', // Siempre nace pendiente de pago
      createdAt: new Date(),
      // Aseguramos que checkIn/checkOut sean fechas válidas
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
    };

    // 3. Escribir en Firestore usando Admin SDK (Se salta las reglas de seguridad)
    const docRef = await adminDb.collection('reservations').add(newReservation);

    // 4. Retornar el ID para que el front-end pueda iniciar el pago
    return { success: true, reservationId: docRef.id };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar la reserva";
    if (process.env.NODE_ENV === 'development') {
      console.error("[handleCreatePublicReservation]", error);
    }
    return { success: false, error: message };
  }
}