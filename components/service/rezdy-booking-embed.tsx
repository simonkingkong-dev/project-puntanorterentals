"use client";

import { useCallback } from "react";
import { ExternalLink, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRezdyAffiliateBookingUrl } from "@/lib/rezdy-config";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";

export interface RezdyBookingEmbedProps {
  className?: string;
}

/**
 * Embed de catálogo/reservas Rezdy (afiliado Mexico Divers).
 * Escritorio: iframe dentro de la página. Móvil: CTA que redirige al mismo URL (mejor UX que iframe).
 */
export default function RezdyBookingEmbed({ className }: RezdyBookingEmbedProps) {
  const { t } = useLocale();
  const bookingUrl = getRezdyAffiliateBookingUrl();

  const goToPartnerBooking = useCallback(() => {
    window.location.assign(bookingUrl);
  }, [bookingUrl]);

  return (
    <section
      className={cn("w-full", className)}
      aria-label={t("rezdy_embed_section_label", "Partner tour bookings")}
    >
      {/* Desktop / tablet landscape: iframe */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <iframe
          title={t("rezdy_iframe_title", "Book tours and activities")}
          src={bookingUrl}
          className="w-full border-0 min-h-[calc(100vh-14rem)] h-[900px]"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>

      {/* Mobile: redirect (iframes de terceros suelen ser incómodos en pantallas pequeñas) */}
      <div className="md:hidden rounded-xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 mb-5">
          <Waves className="h-7 w-7 text-sky-600" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("rezdy_mobile_title", "Tours y actividades en el mar")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
          {t(
            "rezdy_mobile_body",
            "Para reservar snorkel, buceo y experiencias con nuestro socio, continúa en la página segura de reservas."
          )}
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full sm:w-auto min-h-[48px] bg-orange-600 hover:bg-orange-700"
          onClick={goToPartnerBooking}
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
          {t("rezdy_mobile_cta", "Continuar a reservar")}
        </Button>
        <p className="mt-4 text-xs text-gray-500">
          {t("rezdy_mobile_note", "Serás redirigido al sistema de reservas de nuestro proveedor.")}
        </p>
      </div>
    </section>
  );
}
