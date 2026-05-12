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
import { useLocale } from "@/components/providers/locale-provider";

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
  const { t } = useLocale();
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
            {t("hostfully_widget_unconfigured", "Hostfully widget not configured")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 space-y-2">
          <p>
            {t(
              "hostfully_widget_env_help",
              "Add NEXT_PUBLIC_HOSTFULLY_WIDGET_SCRIPT_SRC to the environment (and optionally NEXT_PUBLIC_HOSTFULLY_BOOKING_IFRAME_URL) based on the Hostfully panel snippet."
            )}
          </p>
          <p>
            {t(
              "hostfully_widget_agency_help",
              "NEXT_PUBLIC_HOSTFULLY_AGENCY_UID must also match your Hostfully agency."
            )}
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
          title={t("hostfully_iframe_title", "Hostfully booking")}
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
        {t(
          "hostfully_widget_note",
          "Dates, rates, and payment are managed by Hostfully. Fine-tune the widget appearance in Hostfully -> Custom branding / Custom CSS."
        )}
      </p>
    </div>
  );
}
