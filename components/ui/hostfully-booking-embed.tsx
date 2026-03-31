"use client";

import Script from "next/script";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildHostfullyIframeSrc,
  getHostfullyBookingIframeUrlTemplate,
  getHostfullyPublicAgencyUid,
  getHostfullyWidgetDataAttributeNames,
  getHostfullyWidgetRootClassName,
  getHostfullyWidgetScriptSrc,
  hasHostfullyWidgetConfig,
} from "@/lib/hostfully-widget-config";
import { cn } from "@/lib/utils";

export interface HostfullyBookingEmbedProps {
  /** UID de la propiedad en Hostfully (mismo valor que `hostfullyPropertyId` en Firestore). */
  hostfullyPropertyUid: string;
  className?: string;
}

/**
 * Incrusta el calendario / formulario de reserva de Hostfully.
 *
 * Modo A — script + div: define NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC y, si hace falta,
 * ajusta los nombres de atributos data-* con NEXT_PUBLIC_HOSTFULLY_WIDGET_DATA_*_ATTR.
 *
 * Modo B — iframe: define NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL con {propertyUid} y {agencyUid}.
 *
 * Estilos: acota el contenedor aquí; colores/botones del widget → Hostfully → Custom CSS / Branding.
 */
export default function HostfullyBookingEmbed({
  hostfullyPropertyUid,
  className,
}: HostfullyBookingEmbedProps) {
  const agencyUid = getHostfullyPublicAgencyUid();
  const scriptSrc = getHostfullyWidgetScriptSrc();
  const iframeTemplate = getHostfullyBookingIframeUrlTemplate();
  const rootClass = getHostfullyWidgetRootClassName();
  const { agency: agencyAttr, property: propertyAttr } =
    getHostfullyWidgetDataAttributeNames();

  const dataProps = useMemo(() => {
    const o: Record<string, string> = {
      [propertyAttr]: hostfullyPropertyUid,
    };
    if (agencyUid) o[agencyAttr] = agencyUid;
    return o;
  }, [agencyAttr, propertyAttr, hostfullyPropertyUid, agencyUid]);

  const iframeSrc = useMemo(() => {
    if (!iframeTemplate) return null;
    return buildHostfullyIframeSrc(iframeTemplate, hostfullyPropertyUid, agencyUid);
  }, [iframeTemplate, hostfullyPropertyUid, agencyUid]);

  if (!hasHostfullyWidgetConfig()) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900 text-base">
            Widget Hostfully no configurado
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 space-y-2">
          <p>
            Añade en el entorno{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC</code>{" "}
            (y opcionalmente{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL</code>
            ) según el snippet del panel Hostfully.
          </p>
          <p>
            También{" "}
            <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_HOSTFULLY_AGENCY_UID</code>{" "}
            debe coincidir con tu agencia en Hostfully.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (iframeSrc) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-white overflow-hidden min-h-[520px]",
          className
        )}
      >
        <iframe
          title="Reserva Hostfully"
          src={iframeSrc}
          className="w-full min-h-[520px] border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (!scriptSrc) {
    return null;
  }

  return (
    <div className={cn("hostfully-booking-embed space-y-3", className)}>
      <Script src={scriptSrc} strategy="afterInteractive" />
      <div
        className={cn(
          rootClass,
          "rounded-lg border border-gray-200 bg-white p-2 min-h-[480px]"
        )}
        {...dataProps}
      />
      <p className="text-xs text-gray-500">
        Las fechas, precios y el pago los gestiona Hostfully. Apariencia fina del widget: panel
        Hostfully → Custom branding / Custom CSS.
      </p>
    </div>
  );
}
