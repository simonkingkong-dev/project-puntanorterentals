import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { createHostfullyBookingLead, deleteHostfullyLead, extractLeadUid } from '@/lib/hostfully/client';
import { buildHostfullyHoldPayload } from '@/lib/hostfully/hold-payload';

/**
 * Hold en Hostfully: mientras el huésped paga, las mismas fechas quedan bloqueadas en el
 * PMS (y por tanto en las OTAs sincronizadas con él), no solo en este sitio.
 *
 * Ciclo de vida del bloqueo (`reservations/{id}.hostfullyHoldLeadUid`):
 *  - se crea al reclamar las fechas (POST /api/reservations/[id]/hold);
 *  - se borra al liberar la reserva (timer en 0, cart, reintento, admin, cron de expirados);
 *  - se borra justo antes de crear la reserva BOOKING cuando el pago se confirma.
 * Todo lo que toca Hostfully respeta HOSTFULLY_ENABLE_WRITES, igual que la reserva final.
 */

function writesEnabled(): boolean {
  return process.env.HOSTFULLY_ENABLE_WRITES === 'true';
}

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    const t = v as { toDate: () => Date };
    if (typeof t.toDate === 'function') return t.toDate();
  }
  return new Date(v as string | number);
}

export type PlaceHoldResult =
  | { ok: true; skipped?: 'writes_disabled' | 'no_hostfully_property'; leadUid?: string; alreadyPlaced?: boolean }
  | { ok: false; error: string };

/**
 * Crea el BLOCK en Hostfully para la reserva y guarda su uid. Idempotente.
 * `reason` se usa al restaurar un bloqueo tras un fallo post-pago.
 */
export async function placeHostfullyHold(
  reservationId: string,
  opts: { reason?: string } = {}
): Promise<PlaceHoldResult> {
  if (!writesEnabled()) return { ok: true, skipped: 'writes_disabled' };
  try {
    const ref = adminDb.collection('reservations').doc(reservationId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: 'Reserva no encontrada' };
    const data = snap.data()!;

    const existing = typeof data.hostfullyHoldLeadUid === 'string' ? data.hostfullyHoldLeadUid : '';
    if (existing) return { ok: true, leadUid: existing, alreadyPlaced: true };

    const propSnap = data.propertyId
      ? await adminDb.collection('properties').doc(String(data.propertyId)).get()
      : null;
    const propertyUid = propSnap?.exists ? (propSnap.data()?.hostfullyPropertyId as string | undefined) : undefined;
    if (!propertyUid) return { ok: true, skipped: 'no_hostfully_property' };

    const payload = buildHostfullyHoldPayload({
      propertyUid,
      reservationId,
      checkIn: toDateSafe(data.checkIn),
      checkOut: toDateSafe(data.checkOut),
      expiresAt: data.expiresAt ? toDateSafe(data.expiresAt) : null,
      reason: opts.reason,
    });
    const lead = await createHostfullyBookingLead(payload);
    const leadUid = extractLeadUid(lead);
    if (!leadUid) return { ok: false, error: 'Hostfully no devolvió el uid del bloqueo' };

    await ref.update({
      hostfullyHoldLeadUid: leadUid,
      hostfullyHoldCreatedAt: new Date(),
    });
    return { ok: true, leadUid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Hostfully] No se pudo crear el hold:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * Borra el BLOCK de la reserva en Hostfully (si hay) y limpia el campo. Nunca lanza:
 * si Hostfully falla, el uid queda guardado y el cron de expirados lo reintenta.
 */
export async function releaseHostfullyHold(
  reservationId: string
): Promise<{ released: boolean; hadHold: boolean; error?: string }> {
  try {
    const ref = adminDb.collection('reservations').doc(reservationId);
    const snap = await ref.get();
    if (!snap.exists) return { released: false, hadHold: false };
    const uid = snap.data()?.hostfullyHoldLeadUid;
    if (typeof uid !== 'string' || !uid) return { released: false, hadHold: false };

    await deleteHostfullyLead(uid);
    await ref.update({
      hostfullyHoldLeadUid: FieldValue.delete(),
      hostfullyHoldReleasedAt: new Date(),
    });
    return { released: true, hadHold: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[Hostfully] No se pudo borrar el hold de ${reservationId} (se reintenta en el cron):`, msg);
    return { released: false, hadHold: true, error: msg };
  }
}

/**
 * Cron: libera los holds de Hostfully que ya no deben existir.
 *  - reserva `pending` con `expiresAt` vencido → se libera (queda `incomplete`) y se borra el bloqueo;
 *  - reserva `incomplete`/`cancelled` con bloqueo → se borra (reintento de un borrado fallido);
 *  - reserva `confirmed` con su BOOKING ya creado → se borra el bloqueo sobrante.
 * Una `confirmed` sin BOOKING conserva el bloqueo a propósito: está pagada y las fechas deben
 * seguir tomadas hasta que alguien cree la reserva en Hostfully.
 */
export async function sweepHostfullyHolds(): Promise<{
  scanned: number;
  expiredReleased: number;
  holdsDeleted: number;
  failed: number;
}> {
  const { releasePendingReservationAdmin } = await import('@/lib/firebase-admin-queries');
  const snap = await adminDb.collection('reservations').where('hostfullyHoldLeadUid', '>', '').get();
  const now = new Date();
  let expiredReleased = 0;
  let holdsDeleted = 0;
  let failed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const status = data.status as string;

    if (status === 'pending') {
      const expiresAt = data.expiresAt ? toDateSafe(data.expiresAt) : null;
      if (expiresAt && expiresAt > now) continue;
      // Libera la reserva (→ incomplete) y borra el bloqueo.
      await releasePendingReservationAdmin(doc.id);
      expiredReleased++;
      const after = await adminDb.collection('reservations').doc(doc.id).get();
      if (after.data()?.hostfullyHoldLeadUid) failed++;
      continue;
    }

    if (status === 'confirmed' && !data.hostfullyLeadUid) continue;

    const r = await releaseHostfullyHold(doc.id);
    if (r.released) holdsDeleted++;
    else if (r.error) failed++;
  }

  return { scanned: snap.size, expiredReleased, holdsDeleted, failed };
}
