import { NextRequest, NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { adminDb } from '@/lib/firebase-admin';
import { generateDateRange } from '@/lib/utils/date';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';
import {
  getBlockingPropertyIds,
  getInventoryGroupId,
} from '@/lib/property-hierarchy';

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    const t = v as { toDate: () => Date };
    if (typeof t.toDate === 'function') return t.toDate();
  }
  return new Date(v as string | number);
}

/** Noches ocupadas; el check-out es exclusivo para permitir relevo el mismo día. */
function occupiedNights(checkIn: Date, checkOut: Date): string[] {
  const lastNight = addDays(checkOut, -1);
  if (lastNight < checkIn) return [];
  return generateDateRange(checkIn, lastNight);
}

/**
 * POST /api/reservations/[id]/hold
 * Reclama las fechas para esta reserva antes de pagar.
 *
 * Es el único punto donde el inventario se reclama de verdad, así que la comprobación
 * y la escritura van dentro de una transacción. Firestore sólo bloquea los documentos
 * que la transacción *lee*, y un hold creado en paralelo es un fantasma que ese bloqueo
 * no cubre; por eso todos los reclamos del mismo grupo padre/hijo leen y escriben un
 * documento común en `inventory_locks`, que es lo que los serializa. Sin esa escritura
 * la transacción no entra en conflicto y dos huéspedes podrían pagar las mismas noches.
 *
 * Idempotente: si la reserva ya tenía `datesHeld`, no hace nada.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
  }

  try {
    const ref = adminDb.collection('reservations').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.status !== 'pending') {
      return NextResponse.json({ error: 'Solo se pueden bloquear fechas de reservas pendientes' }, { status: 400 });
    }

    if (data.datesHeld === true) {
      return NextResponse.json({ held: true, alreadyHeld: true });
    }

    const propertyId = String(data.propertyId ?? '');
    if (!propertyId) {
      return NextResponse.json({ error: 'Reserva sin propiedad asociada' }, { status: 400 });
    }
    const checkIn = toDateSafe(data.checkIn);
    const checkOut = toDateSafe(data.checkOut);

    // Consulta al PMS ANTES de la transacción: nunca I/O de red dentro de una
    // transacción que puede reintentarse.
    const availability = await checkPropertyAvailability(propertyId, checkIn, checkOut, {
      excludeReservationId: id,
      excludeClientToken: typeof data.clientToken === 'string' ? data.clientToken : undefined,
      enforceStayRules: true,
    });
    if (!availability.available) {
      return NextResponse.json(
        { error: availability.error || 'Las fechas ya no están disponibles' },
        { status: 409 }
      );
    }

    const [blockingIds, groupId] = await Promise.all([
      getBlockingPropertyIds(propertyId),
      getInventoryGroupId(propertyId),
    ]);
    const groupIds = Array.from(new Set([propertyId, ...blockingIds]));
    const requestedNights = new Set(occupiedNights(checkIn, checkOut));
    const lockRef = adminDb.collection('inventory_locks').doc(groupId);

    const claimed = await adminDb.runTransaction(async (t) => {
      const lockSnap = await t.get(lockRef);

      const current = await t.get(ref);
      if (!current.exists) return { ok: false, error: 'Reserva no encontrada', status: 404 };
      const currentData = current.data()!;
      if (currentData.status !== 'pending') {
        return { ok: false, error: 'La reserva ya no está pendiente', status: 400 };
      }
      if (currentData.datesHeld === true) return { ok: true, alreadyHeld: true };

      const now = new Date();
      for (const pid of groupIds) {
        const rivals = await t.get(
          adminDb
            .collection('reservations')
            .where('propertyId', '==', pid)
            .where('status', 'in', ['pending', 'confirmed'])
        );

        for (const doc of rivals.docs) {
          if (doc.id === id) continue;
          const rival = doc.data();

          if (rival.status === 'pending') {
            if (rival.datesHeld !== true) continue;
            const expiresAt = rival.expiresAt ? toDateSafe(rival.expiresAt) : null;
            if (expiresAt && expiresAt <= now) continue;
          }

          const rivalNights = occupiedNights(
            toDateSafe(rival.checkIn),
            toDateSafe(rival.checkOut)
          );
          if (rivalNights.some((d) => requestedNights.has(d))) {
            return {
              ok: false,
              error: 'Esas fechas acaban de ser tomadas por otro huésped.',
              status: 409,
            };
          }
        }
      }

      // Escritura obligatoria: es lo que hace colisionar dos reclamos del mismo grupo.
      const seq = Number(lockSnap.data()?.seq ?? 0) + 1;
      t.set(lockRef, { seq, groupId, updatedAt: new Date() }, { merge: true });
      t.update(ref, { datesHeld: true });
      return { ok: true, alreadyHeld: false };
    });

    if (!claimed.ok) {
      return NextResponse.json({ error: claimed.error }, { status: claimed.status });
    }

    return NextResponse.json({ held: true, alreadyHeld: claimed.alreadyHeld === true });
  } catch (error) {
    console.error('Error en hold de reserva:', error);
    return NextResponse.json({ error: 'Error al bloquear fechas' }, { status: 500 });
  }
}
