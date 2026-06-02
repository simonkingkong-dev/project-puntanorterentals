"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { startOfDay, isBefore } from "date-fns";
import { es as esLocale, enUS } from "date-fns/locale";
import type { Service } from "@/lib/types";
import { useLocale } from "@/components/providers/locale-provider";

interface ServiceBookingPanelProps {
  service: Service;
}

export default function ServiceBookingPanel({ service }: ServiceBookingPanelProps) {
  const { locale, t } = useLocale();
  const dateFnsLocale = locale === "en" ? enUS : esLocale;
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [dailyRates, setDailyRates] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 12);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    fetch(
      `/api/services/calendar?serviceId=${encodeURIComponent(service.id)}&startDate=${fmt(start)}&endDate=${fmt(end)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.availability) setAvailability(data.availability);
        if (data.dailyRates) setDailyRates(data.dailyRates);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [service.id]);

  const disabledDays = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return true;
    if (availability[key] === false) return true;
    return false;
  };

  const selectedKey = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`
    : null;
  const rate =
    (selectedKey && dailyRates[selectedKey]) ||
    service.priceFrom ||
    Object.values(dailyRates).find((r) => r > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("service_booking_title", "Availability")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-64 rounded-lg bg-muted animate-pulse" />
        ) : (
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            disabled={disabledDays}
            locale={dateFnsLocale}
            className="rounded-md border"
          />
        )}
        {selected && rate != null && (
          <p className="text-sm text-muted-foreground">
            {t("service_selected_date_price", "From ${price} USD for selected date").replace(
              "{price}",
              String(Math.round(rate))
            )}
          </p>
        )}
        {service.externalLink ? (
          <Button asChild className="w-full bg-teal-600 hover:bg-teal-700">
            <Link href={service.externalLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("service_book_experience", "Book experience")}
            </Link>
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t(
            "service_provider_notice",
            "Calendar syncs from your provider settings. Connect API or iCal in admin when ready."
          )}
        </p>
      </CardContent>
    </Card>
  );
}
