"use client";

import { useEffect, useState } from "react";
import { getHostfullyOrbiCalendarScriptSrc } from "@/lib/hostfully-widget-scripts";
import { cn } from "@/lib/utils";

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).some((s) => s.src === src);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    document.body.appendChild(s);
  });
}

export interface HostfullyCalendarWidgetEmbedProps {
  propertyFirestoreId: string;
  /** Id numérico del snippet Orbi (`id` en `new orbiwidget(...)`). */
  widgetId: number;
  /** Nombre mostrado por el calendario (ej. título de la propiedad). */
  name: string;
  showTentative?: number;
  monthsToDisplay?: number;
  className?: string;
}

/**
 * Calendario de disponibilidad Hostfully (orbirental_calendar_widget_v2.js).
 */
export default function HostfullyCalendarWidgetEmbed({
  propertyFirestoreId,
  widgetId,
  name,
  showTentative = 0,
  monthsToDisplay = 2,
  className,
}: HostfullyCalendarWidgetEmbedProps) {
  const containerId = `hostfully-cal-${propertyFirestoreId.replace(/[^a-zA-Z0-9_-]/g, "")}-${widgetId}`;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(widgetId) || widgetId <= 0) return;

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        await loadScriptOnce(getHostfullyOrbiCalendarScriptSrc());
        if (cancelled) return;
        const Orbi = window.orbiwidget;
        if (typeof Orbi !== "function") {
          setError("Hostfully: `orbiwidget` no está disponible tras cargar el script.");
          return;
        }
        new Orbi(containerId, {
          id: widgetId,
          showTentative,
          monthsToDisplay,
          name,
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error cargando calendario Hostfully");
        }
      }
    })();

    return () => {
      cancelled = true;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [containerId, widgetId, name, showTentative, monthsToDisplay]);

  return (
    <div className={cn("hostfully-calendar-widget-embed space-y-3", className)}>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div
        id={containerId}
        className="rounded-lg border border-gray-200 bg-white p-2 min-h-[280px]"
      />
    </div>
  );
}
