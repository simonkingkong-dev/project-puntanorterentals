/**
 * URLs públicas de los JS de widgets Hostfully (platform.hostfully.com).
 * Puedes sobreescribirlas con NEXT_PUBLIC_* si Hostfully cambia rutas.
 */
export function getHostfullyPikadayScriptSrc(): string {
  return (
    process.env.NEXT_PUBLIC_HOSTFULLY_PIKADAY_SCRIPT?.trim() ||
    "https://platform.hostfully.com/assets/js/pikaday.js"
  );
}

export function getHostfullyLeadCaptureScriptSrc(): string {
  return (
    process.env.NEXT_PUBLIC_HOSTFULLY_LEAD_CAPTURE_SCRIPT?.trim() ||
    "https://platform.hostfully.com/assets/js/leadCaptureWidget_2.0.js"
  );
}

export function getHostfullyOrbiCalendarScriptSrc(): string {
  return (
    process.env.NEXT_PUBLIC_HOSTFULLY_ORBI_CALENDAR_SCRIPT?.trim() ||
    "https://platform.hostfully.com/assets/js/orbirental_calendar_widget_v2.js"
  );
}
