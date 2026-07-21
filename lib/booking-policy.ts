/** Isla Mujeres / Quintana Roo — horario de referencia para reservas de último minuto. */
export const PROPERTY_TIMEZONE = "America/Cancun";

/** Hora estándar de check-in (15:00). */
export const DEFAULT_CHECK_IN_HOUR = 15;

/**
 * Plazo web para reservar el mismo día del check-in.
 * Hostfully admite hasta +7 h (22:00); la web cierra +6 h (21:00).
 */
export const WEB_LAST_MINUTE_CUTOFF_HOURS_AFTER_CHECK_IN = 6;

export const WEB_LAST_MINUTE_CUTOFF_HOUR =
  DEFAULT_CHECK_IN_HOUR + WEB_LAST_MINUTE_CUTOFF_HOURS_AFTER_CHECK_IN;

const LAST_MINUTE_CUTOFF_ERROR_ES =
  "Las reservas en línea para el día de entrada cierran a las 21:00 (hora de Isla Mujeres), seis horas después del check-in a las 15:00.";

const PAST_CHECK_IN_ERROR_ES =
  "La fecha de entrada ya no está disponible para reservar en línea.";

type ZonedClock = { dateKey: string; hour: number; minute: number };

function getZonedClock(date: Date, timeZone: string = PROPERTY_TIMEZONE): ZonedClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const year = pick("year");
  const month = pick("month");
  const day = pick("day");
  let hour = Number.parseInt(pick("hour"), 10);
  const minute = Number.parseInt(pick("minute"), 10);

  // Algunos entornos devuelven 24:00 en lugar de 00:00.
  if (hour === 24) hour = 0;

  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

/** YYYY-MM-DD en la zona horaria de la propiedad. */
export function getDateKeyInPropertyTz(
  date: Date,
  timeZone: string = PROPERTY_TIMEZONE
): string {
  return getZonedClock(date, timeZone).dateKey;
}

/** ¿Aún se aceptan reservas para check-in hoy (antes de las 21:00 hora Isla Mujeres)? */
export function isSameDayWebBookingOpen(
  now: Date = new Date(),
  timeZone: string = PROPERTY_TIMEZONE
): boolean {
  const { hour, minute } = getZonedClock(now, timeZone);
  const nowMinutes = hour * 60 + minute;
  const cutoffMinutes = WEB_LAST_MINUTE_CUTOFF_HOUR * 60;
  return nowMinutes < cutoffMinutes;
}

/**
 * Valida si la web puede aceptar una reserva con esta fecha de check-in.
 * Aplica la regla de último minuto alineada con Hostfully (web un poco más estricta).
 */
export function validateWebCheckInLeadTime(
  checkIn: Date,
  now: Date = new Date(),
  timeZone: string = PROPERTY_TIMEZONE
): { allowed: boolean; error?: string } {
  const checkInKey = getDateKeyInPropertyTz(checkIn, timeZone);
  const todayKey = getDateKeyInPropertyTz(now, timeZone);

  if (checkInKey < todayKey) {
    return { allowed: false, error: PAST_CHECK_IN_ERROR_ES };
  }

  if (checkInKey > todayKey) {
    return { allowed: true };
  }

  if (!isSameDayWebBookingOpen(now, timeZone)) {
    return { allowed: false, error: LAST_MINUTE_CUTOFF_ERROR_ES };
  }

  return { allowed: true };
}

/** Para calendarios: bloquear fechas pasadas o hoy tras el corte de último minuto. */
export function isCheckInDateDisabledForWebBooking(
  date: Date,
  now: Date = new Date(),
  timeZone: string = PROPERTY_TIMEZONE
): boolean {
  const dateKey = getDateKeyInPropertyTz(date, timeZone);
  const todayKey = getDateKeyInPropertyTz(now, timeZone);

  if (dateKey < todayKey) return true;
  if (dateKey === todayKey && !isSameDayWebBookingOpen(now, timeZone)) return true;
  return false;
}
