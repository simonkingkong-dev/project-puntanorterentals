/**
 * Lógica compartida para crear un lead BOOKING en Hostfully al confirmar una reserva.
 * Usado por el webhook de Stripe y por confirm-by-payment-intent.
 */
import { getPropertyByIdAdmin } from '@/lib/firebase-admin-queries';
import { createHostfullyBookingLead } from '@/lib/hostfully/client';

export interface SyncBookingToHostfullyParams {
  checkIn: Date;
  checkOut: Date;
  guestName?: string;
  guestEmail?: string;
}

/**
 * Si HOSTFULLY_ENABLE_WRITES está activo y la propiedad tiene hostfullyPropertyId,
 * crea un lead de tipo BOOKING en Hostfully. Los errores se registran en desarrollo
 * y no se propagan para no fallar la confirmación de la reserva.
 */
export async function trySyncBookingToHostfully(
  propertyId: string,
  params: SyncBookingToHostfullyParams
): Promise<void> {
  try {
    const hostfullyWritesEnabled = process.env.HOSTFULLY_ENABLE_WRITES === 'true';
    if (!hostfullyWritesEnabled) return;

    const property = await getPropertyByIdAdmin(propertyId);
    const hostfullyPropertyId = property?.hostfullyPropertyId;
    if (!hostfullyPropertyId) return;

    const payload = {
      type: 'BOOKING',
      status: 'BOOKED',
      propertyUid: hostfullyPropertyId,
      checkIn: params.checkIn.toISOString(),
      checkOut: params.checkOut.toISOString(),
      guestName: params.guestName,
      guestEmail: params.guestEmail,
    };
    await createHostfullyBookingLead(payload);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Hostfully] Error creando lead de reserva:', e);
    }
  }
}
