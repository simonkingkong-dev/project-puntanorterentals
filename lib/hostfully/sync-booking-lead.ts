/**
 * Lógica compartida para crear un lead BOOKING en Hostfully al confirmar una reserva.
 * Usado por el webhook de Stripe y por confirm-by-payment-intent.
 */
import { getPropertyByIdAdmin } from '@/lib/firebase-admin-queries';
import { createHostfullyBookingLead, extractLeadUid, registerHostfullyLeadPayment } from '@/lib/hostfully/client';
import { placeHostfullyHold, releaseHostfullyHold } from '@/lib/hostfully/holds';
import { adminDb } from '@/lib/firebase-admin';
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
  /** Total cobrado en el sitio, siempre en USD (Hostfully opera en USD). Se envía como quoteOverrides.totalPrice. */
  totalAmountUsd?: number;
  guests?: number;
  /** Idioma del huésped al reservar; se exporta como guestInformation.preferredLocale para que los mensajes de Hostfully lleguen en su idioma. */
  locale?: 'es' | 'en';
  /** Lo realmente cobrado por Stripe (puede ser MXN/EUR); se deja en la nota para poder conciliar. */
  chargedAmount?: number;
  chargedCurrency?: string;
  stripePaymentIntentId?: string;
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
    if (params.locale === 'es' || params.locale === 'en') {
      guestInformation.preferredLocale = { language: params.locale };
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
      // Sin esto, Hostfully calcula su propio total con su tarifa base (ignora un `totalPrice`
      // suelto): ver quote-overrides.ts.
      payload.quoteOverrides = buildHostfullyQuoteOverrides(totalUsd);
      const charged = Number(params.chargedAmount);
      const chargedCur = (params.chargedCurrency ?? '').toUpperCase();
      const stripePart =
        Number.isFinite(charged) && charged > 0 && chargedCur
          ? ` Cobrado en Stripe: ${charged.toFixed(2)} ${chargedCur}${
              params.stripePaymentIntentId ? ` (${params.stripePaymentIntentId})` : ''
            }.`
          : '';
      payload.notes = `Reserva web Punta Norte — total ${totalUsd} USD (incl. IVA/ISH).${stripePart}`;
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
    // El bloqueo temporal (hold) y la reserva ocupan las mismas noches: primero se libera el
    // bloqueo. Si crear la reserva falla, se restaura para que las fechas no queden libres
    // estando ya pagadas.
    if (params.reservationId) await releaseHostfullyHold(params.reservationId);
    let hostfullyLead: Record<string, unknown>;
    try {
      hostfullyLead = await createHostfullyBookingLead(payload);
    } catch (createErr) {
      if (params.reservationId) {
        await placeHostfullyHold(params.reservationId, {
          reason: 'PAGADA en Stripe pero falló crear la reserva aquí: crearla a mano y borrar este bloqueo.',
        });
      }
      throw createErr;
    }
    const leadUid = extractLeadUid(hostfullyLead);
    if (!leadUid) {
      console.error('[Hostfully] El lead se creó pero la respuesta no trae su UID:', JSON.stringify(hostfullyLead)?.slice(0, 300));
    }
    return { synced: true, leadUid };
  } catch (e) {
    console.error('[Hostfully] Error creando lead de reserva:', e);
    return { synced: false, error: e };
  }
}

/**
 * Registra el pago en el order del lead y deja constancia del resultado en la reserva
 * (`hostfullyPaymentSync`), para poder diagnosticar un pago que Hostfully no muestra.
 *
 * El importe va en USD (la moneda del order en Hostfully); lo cobrado en MXN/EUR se
 * deja en la nota. Mandar el importe de Stripe tal cual registraba pesos como dólares.
 */
export async function registerAndRecordHostfullyPayment(params: {
  reservationId: string;
  leadUid: string;
  amountUsd: number;
  chargedAmount: number;
  chargedCurrency: string;
  stripePaymentIntentId: string;
  paidAt?: Date;
}): Promise<{ synced: boolean; error?: string }> {
  const cur = params.chargedCurrency.toUpperCase();
  let result: { synced: boolean; error?: string; orderUid?: string; orderTotal?: number };
  try {
    result = await registerHostfullyLeadPayment({
      leadUid: params.leadUid,
      amount: params.amountUsd,
      currency: 'USD',
      paidAt: params.paidAt,
      externalPaymentId: params.stripePaymentIntentId,
      note: `Pago Stripe ${params.stripePaymentIntentId} — ${params.chargedAmount.toFixed(2)} ${cur} (equivale a ${params.amountUsd.toFixed(2)} USD).`,
    });
  } catch (e) {
    result = { synced: false, error: e instanceof Error ? e.message : String(e) };
  }
  if (!result.synced) {
    console.error('[Hostfully] No se pudo registrar el pago del lead:', result.error);
  }
  try {
    await adminDb.collection('reservations').doc(params.reservationId).update({
      hostfullyPaymentSync: {
        ok: result.synced,
        error: result.synced ? null : String(result.error ?? 'desconocido').slice(0, 500),
        orderUid: result.orderUid ?? null,
        // Total del order en Hostfully vs lo cobrado: si difieren, el total del lead no se aplicó.
        orderTotalUsd: result.orderTotal ?? null,
        paidUsd: params.amountUsd,
        totalsMatch:
          result.orderTotal == null ? null : Math.abs(result.orderTotal - params.amountUsd) <= 0.01,
        at: new Date(),
      },
    });
  } catch (e) {
    console.error('[Hostfully] No se pudo guardar hostfullyPaymentSync:', e);
  }
  return result;
}
