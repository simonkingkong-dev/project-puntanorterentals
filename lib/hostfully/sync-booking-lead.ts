/**
 * Lógica compartida para crear un lead BOOKING en Hostfully al confirmar una reserva.
 * Usado por el webhook de Stripe y por confirm-by-payment-intent.
 */
import { getPropertyByIdAdmin } from '@/lib/firebase-admin-queries';
import { createHostfullyBookingLead } from '@/lib/hostfully/client';
import { buildHostfullyQuoteOverrides } from '@/lib/hostfully/quote-overrides';

function isHostfullyDebugEnabled(): boolean {
  return process.env.HOSTFULLY_DEBUG === 'true';
}

export interface SyncBookingToHostfullyParams {
  reservationId?: string;
  checkIn: Date;
  checkOut: Date;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  /** Total cobrado en el sitio (USD, con impuestos). Se envía en quoteOverrides y notas. */
  totalAmountUsd?: number;
  guests?: number;
}

export type SyncBookingResult =
  | { synced: true; leadUid?: string }
  | { synced: false; error: unknown };

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

    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    const toLocalDateTime = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
    };
    const normalizedName = (params.guestName ?? '').trim();
    const firstName =
      (params.guestFirstName ?? '').trim() ||
      normalizedName.split(/\s+/).filter(Boolean)[0] ||
      'Guest';
    const lastName =
      (params.guestLastName ?? '').trim() ||
      normalizedName
        .split(/\s+/)
        .filter(Boolean)
        .slice(1)
        .join(' ') ||
      'Punta Norte';
    const guestPhone = (params.guestPhone ?? '').trim();
    const guestInformation: Record<string, unknown> = {
      firstName,
      lastName,
      email: params.guestEmail,
      fullName: normalizedName || `${firstName} ${lastName}`,
    };
    if (guestPhone) {
      guestInformation.phoneNumber = guestPhone;
    }
    const guests = Number(params.guests);
    if (Number.isFinite(guests) && guests > 0) {
      guestInformation.adultCount = guests;
    }

    const payload: Record<string, unknown> = {
      type: 'BOOKING',
      status: 'BOOKED',
      propertyUid: hostfullyPropertyId,
      // Variante confirmada para este tenant.
      checkInLocalDateTime: toLocalDateTime(params.checkIn),
      checkOutLocalDateTime: toLocalDateTime(params.checkOut),
      guestInformation,
      externalReservationId: params.reservationId,
      channel: 'HOSTFULLY',
      // Backward-compat sin interferir con el esquema principal.
      checkInDate: toDateStr(params.checkIn),
      checkOutDate: toDateStr(params.checkOut),
    };
    const totalUsd = Number(params.totalAmountUsd);
    if (Number.isFinite(totalUsd) && totalUsd > 0) {
      const quoteOverrides = buildHostfullyQuoteOverrides(totalUsd);
      if (quoteOverrides) {
        payload.quoteOverrides = quoteOverrides;
      }
      payload.notes = `Reserva web Punta Norte — total cobrado ${totalUsd} USD (incl. IVA/ISH).`;
    }
    if (process.env.NODE_ENV === 'development' && isHostfullyDebugEnabled()) {
      console.log('[Hostfully] Creando lead con payload estable', {
        propertyUid: payload.propertyUid,
        checkInLocalDateTime: payload.checkInLocalDateTime,
        checkOutLocalDateTime: payload.checkOutLocalDateTime,
        hasGuestEmail: Boolean(params.guestEmail),
        hasGuestPhone: Boolean(guestPhone),
      });
    }
    const hostfullyLead = await createHostfullyBookingLead(payload);
    const leadUid =
      (hostfullyLead?.uid as string | undefined) ??
      (hostfullyLead?.leadUid as string | undefined);
    return { synced: true, leadUid };
  } catch (e) {
    console.error('[Hostfully] Error creando lead de reserva:', e);
    return { synced: false, error: e };
  }
}