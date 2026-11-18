/**
 * Payload del bloqueo (hold) temporal que se crea en Hostfully mientras el huésped paga.
 *
 * Hostfully no tiene "hold con expiración": un BLOCK dura hasta que alguien lo borra.
 * Por eso el vencimiento lo controla este sitio (ver `holds.ts` y el cron
 * `release-expired-holds`); aquí solo se deja la hora de vencimiento en la nota para que
 * el equipo sepa de quién es el bloqueo y hasta cuándo debería existir.
 */

export interface HostfullyHoldPayloadInput {
  propertyUid: string;
  reservationId: string;
  checkIn: Date;
  checkOut: Date;
  /** Vencimiento del hold; si no hay, la nota lo indica sin hora. */
  expiresAt?: Date | null;
  /** Nota extra (p. ej. cuando se restaura un bloqueo tras un fallo post-pago). */
  reason?: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toLocalDateTimeStr(d: Date): string {
  return `${toLocalDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function buildHostfullyHoldPayload(input: HostfullyHoldPayloadInput): Record<string, unknown> {
  const expiry =
    input.expiresAt && Number.isFinite(input.expiresAt.getTime())
      ? ` Vence ~${input.expiresAt.toISOString()} (se libera sola si no se paga).`
      : '';
  const reason = input.reason ? ` ${input.reason}` : '';
  return {
    type: 'BLOCK',
    status: 'BLOCKED',
    propertyUid: input.propertyUid,
    checkInLocalDateTime: toLocalDateTimeStr(input.checkIn),
    checkOutLocalDateTime: toLocalDateTimeStr(input.checkOut),
    checkInDate: toLocalDateStr(input.checkIn),
    checkOutDate: toLocalDateStr(input.checkOut),
    channel: 'HOSTFULLY',
    notes: `Hold web Punta Norte — reserva ${input.reservationId} en proceso de pago.${expiry}${reason}`,
  };
}
