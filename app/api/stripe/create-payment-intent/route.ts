import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { checkPropertyAvailability } from '@/app/(public)/properties/actions';
import { getNightsBetween } from '@/lib/utils/date';
import { getEffectiveAvailability } from '@/lib/property-hierarchy';

const MXN_MARGIN = 0.2;

/** Tolerancia al comparar importes en USD (redondeos de punto flotante). */
const AMOUNT_EPSILON = 0.01;

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    const t = v as { toDate: () => Date };
    if (typeof t.toDate === 'function') return t.toDate();
  }
  return new Date(v as string | number);
}

async function getUsdMxnRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=MXN', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Exchange API error');
    const data = (await res.json()) as { rates?: { MXN?: number } };
    const officialRate = data.rates?.MXN;
    if (typeof officialRate !== 'number' || !Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error('Invalid MXN rate');
    }
    return officialRate + MXN_MARGIN;
  } catch {
    const fallback = Number(process.env.USD_MXN_RATE) || 17.2;
    return fallback + MXN_MARGIN;
  }
}

async function getUsdEurRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('Exchange API error');
    const data = (await res.json()) as { rates?: { EUR?: number } };
    const officialRate = data.rates?.EUR;
    if (typeof officialRate !== 'number' || !Number.isFinite(officialRate) || officialRate <= 0) {
      throw new Error('Invalid EUR rate');
    }
    return officialRate;
  } catch {
    return Number(process.env.USD_EUR_RATE) || 0.92;
  }
}

/**
 * Última puerta antes del cobro. Ninguna reserva llega a Stripe sin que el servidor
 * confirme aquí que el importe corresponde y que las fechas siguen siendo reservables
 * (incluida la consulta en vivo a Hostfully). Falla cerrado: ante cualquier duda, no se cobra.
 *
 * No se delega en la verificación que hace la página de pago: esa la orquesta el
 * navegador y por tanto se puede saltar.
 */
async function validateChargeable(
  reservationId: unknown,
  amount: number,
  isModification: boolean,
  token: unknown
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (typeof reservationId !== 'string' || !reservationId.trim()) {
    return { ok: false, error: 'reservationId requerido', status: 400 };
  }

  const snap = await adminDb.collection('reservations').doc(reservationId).get();
  if (!snap.exists) {
    return { ok: false, error: 'Reserva no encontrada', status: 404 };
  }
  const data = snap.data()!;
  const propertyId = data.propertyId as string;

  if (isModification) {
    // La reserva ya está confirmada y sus fechas nuevas viven en pendingModification.
    if (typeof token !== 'string' || !token.trim() || token !== data.modifyToken) {
      return { ok: false, error: 'Token de modificación inválido', status: 403 };
    }
    if (data.status !== 'confirmed') {
      return { ok: false, error: 'Solo se pueden modificar reservas confirmadas', status: 400 };
    }
    const pending = data.pendingModification as
      | { newCheckIn: unknown; newCheckOut: unknown; newTotal?: number }
      | undefined;
    if (!pending?.newCheckIn || !pending?.newCheckOut) {
      return { ok: false, error: 'No hay una modificación pendiente', status: 400 };
    }

    const expected = Number(pending.newTotal) - Number(data.totalAmount);
    if (!Number.isFinite(expected) || Math.abs(expected - amount) > AMOUNT_EPSILON) {
      return { ok: false, error: 'El importe no corresponde a la modificación', status: 400 };
    }

    // Solo las noches AÑADIDAS: el propio lead BOOKING de esta reserva ya bloquea las
    // noches originales en Hostfully, así que validar el rango completo fallaría siempre.
    const oldCheckOut = toDateSafe(data.checkOut);
    const newCheckOut = toDateSafe(pending.newCheckOut);
    if (newCheckOut.getTime() > oldCheckOut.getTime()) {
      const extraNights = getNightsBetween(oldCheckOut, newCheckOut);
      const availability = await getEffectiveAvailability(propertyId);
      const blocked = extraNights.find((d) => availability[d] === false);
      if (blocked) {
        return { ok: false, error: `La noche del ${blocked} ya no está disponible`, status: 409 };
      }
    }
    return { ok: true };
  }

  if (data.status !== 'pending') {
    return { ok: false, error: 'Esta reserva ya no está pendiente de pago', status: 409 };
  }
  const expiresAt = data.expiresAt ? toDateSafe(data.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) {
    return { ok: false, error: 'La reserva expiró. Vuelve a elegir fechas.', status: 409 };
  }
  // Prueba de que ganó el reclamo atómico del endpoint de hold.
  if (data.datesHeld !== true) {
    return { ok: false, error: 'Las fechas no están bloqueadas para esta reserva', status: 409 };
  }
  if (Math.abs(Number(data.totalAmount) - amount) > AMOUNT_EPSILON) {
    return { ok: false, error: 'El importe no corresponde a la reserva', status: 400 };
  }

  const availability = await checkPropertyAvailability(
    propertyId,
    toDateSafe(data.checkIn),
    toDateSafe(data.checkOut),
    { excludeReservationId: reservationId, enforceStayRules: true }
  );
  if (!availability.available) {
    return {
      ok: false,
      error: availability.error || 'Las fechas ya no están disponibles',
      status: 409,
    };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', reservationId, modification, token } = await request.json();
    const requestedCurrency = String(currency || 'usd').toLowerCase();
    const normalizedCurrency =
      requestedCurrency === 'mxn' || requestedCurrency === 'eur' ? requestedCurrency : 'usd';

    // Validate amount (Stripe minimum is $0.50 USD)
    if (!amount || amount < 0.5) {
      return NextResponse.json(
        { error: 'El monto debe ser de al menos $0.50 USD' },
        { status: 400 }
      );
    }

    const isModification = modification === true || modification === '1';
    const gate = await validateChargeable(reservationId, Number(amount), isModification, token);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    // Create payment intent
    const metadata: Record<string, string> = {
      reservationId: reservationId || '',
      baseAmountUsd: String(Number(amount)),
      chargeCurrency: normalizedCurrency.toUpperCase(),
    };
    if (isModification) metadata.modification = '1';
    let chargeAmount = Number(amount);
    if (normalizedCurrency === 'mxn') {
      const rate = await getUsdMxnRate();
      chargeAmount = Number(amount) * rate;
      metadata.usdMxnRateApplied = String(rate);
    } else if (normalizedCurrency === 'eur') {
      const rate = await getUsdEurRate();
      chargeAmount = Number(amount) * rate;
      metadata.usdEurRateApplied = String(rate);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100), // smallest currency unit
      currency: normalizedCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}