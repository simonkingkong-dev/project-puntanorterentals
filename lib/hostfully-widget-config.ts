/**
 * Configuración pública del widget Hostfully (solo NEXT_PUBLIC_*).
 *
 * Snippet oficial: panel Hostfully → Publishing / Custom Branding → Booking Widget.
 * Suele incluir un <script src="..."> y un <div> con atributos data-*; los nombres
 * exactos pueden variar: ajusta NEXT_PUBLIC_HOSTFULLY_WIDGET_* si el widget no monta.
 *
 * Alternativa: NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL con placeholders
 * {propertyUid} y opcionalmente {agencyUid}.
 */
export function getHostfullyWidgetScriptSrc(): string | undefined {
  const s = process.env.NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC?.trim();
  return s || undefined;
}

/** Agency UID expuesto al cliente (mismo valor que HOSTFULLY_AGENCY_UID del servidor). */
export function getHostfullyPublicAgencyUid(): string | undefined {
  const s = process.env.NEXT_PUBLIC_HOSTFULLY_AGENCY_UID?.trim();
  return s || undefined;
}

/**
 * Nombres de atributos en el div contenedor (deben incluir prefijo `data-` si aplica).
 * Deben coincidir con el snippet HTML del dashboard Hostfully.
 */
export function getHostfullyWidgetDataAttributeNames(): {
  agency: string;
  property: string;
} {
  return {
    agency:
      process.env.NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_AGENCY_ATTR?.trim() ||
      'data-hostfully-agency-uid',
    property:
      process.env.NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_PROPERTY_ATTR?.trim() ||
      'data-hostfully-property-uid',
  };
}

/** Clase CSS del contenedor (el script puede buscar este nodo). */
export function getHostfullyWidgetRootClassName(): string {
  return (
    process.env.NEXT_PUBLIC_HOSTFULLY_WIDGET_ROOT_CLASS?.trim() ||
    'hostfully-booking-widget'
  );
}

export function getHostfullyBookingIframeUrlTemplate(): string | undefined {
  const s = process.env.NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL?.trim();
  return s || undefined;
}

export function buildHostfullyIframeSrc(
  template: string,
  propertyUid: string,
  agencyUid?: string
): string {
  let url = template.replace(/\{propertyUid\}/g, encodeURIComponent(propertyUid));
  if (agencyUid) {
    url = url.replace(/\{agencyUid\}/g, encodeURIComponent(agencyUid));
  }
  return url;
}

/** True si hay alguna configuración mínima para intentar mostrar el widget. */
export function hasHostfullyWidgetConfig(): boolean {
  return Boolean(getHostfullyWidgetScriptSrc() || getHostfullyBookingIframeUrlTemplate());
}
