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

export type SyncBookingResult = { synced: true } | { synced: false; error: unknown };

/**
 * Si HOSTFULLY_ENABLE_WRITES está activo y la propiedad tiene hostfullyPropertyId,
 * crea un lead de tipo BOOKING en Hostfully. No lanza para no fallar la confirmación;
 * devuelve resultado para que el llamador pueda registrar o alertar si falló.
 */
export async function trySyncBookingToHostfully(
  propertyId: string,
  params: SyncBookingToHostfullyParams
): Promise<SyncBookingResult> {
  try {
    const hostfullyWritesEnabled = process.env.HOSTFULLY_ENABLE_WRITES === 'true';
    if (!hostfullyWritesEnabled) return { synced: true };

    const property = await getPropertyByIdAdmin(propertyId);
    if (property == null) {
      const err = new Error(`Property ${propertyId} not found or failed to fetch`);
      console.error('[Hostfully] Property fetch failed:', err);
      return { synced: false, error: err };
    }

    const hostfullyPropertyId = property.hostfullyPropertyId;
    if (!hostfullyPropertyId) return { synced: true };

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
    return { synced: true };
  } catch (e) {
    console.error('[Hostfully] Error creando lead de reserva:', e);
    return { synced: false, error: e };
  }
}