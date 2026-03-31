"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getHostfullyLeadCaptureScriptSrc,
  getHostfullyPikadayScriptSrc,
} from "@/lib/hostfully-widget-scripts";
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

function mergeLeadWidgetOptions(
  propertyOptionsJson?: string | null
): Record<string, unknown> | null {
  let merged: Record<string, unknown> = {};
  const envJson = process.env.NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON?.trim();
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        merged = { ...merged, ...(parsed as Record<string, unknown>) };
      }
    } catch {
      /* JSON de entorno inválido: se ignora */
    }
  }
  const propJson = propertyOptionsJson?.trim();
  if (propJson) {
    try {
      const parsed = JSON.parse(propJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        merged = { ...merged, ...(parsed as Record<string, unknown>) };
      }
    } catch {
      /* JSON de propiedad inválido: se conserva lo que venga del entorno */
    }
  }
  if (Object.keys(merged).length === 0) return null;
  return merged;
}

export interface HostfullyLeadWidgetEmbedProps {
  /** Id estable de la propiedad en Firestore (ids únicos en DOM). */
  propertyFirestoreId: string;
  /** UUID del snippet Hostfully (2º argumento de `new Widget`). */
  widgetUuid: string;
  /** JSON del tercer argumento del snippet; se fusiona sobre `NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON`. */
  optionsJson?: string | null;
  className?: string;
}

/**
 * Widget Lead / reserva Hostfully (leadCaptureWidget_2.0.js + pikaday.js).
 * Carga scripts en orden e invoca `new Widget(containerId, uuid, options)`.
 */
export default function HostfullyLeadWidgetEmbed({
  propertyFirestoreId,
  widgetUuid,
  optionsJson,
  className,
}: HostfullyLeadWidgetEmbedProps) {
  const containerId = `hostfully-lead-${propertyFirestoreId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const options = useMemo(
    () => mergeLeadWidgetOptions(optionsJson ?? undefined),
    [optionsJson]
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetUuid.trim()) return;
    if (!options) {
      setError("Falta JSON de opciones del widget (admin o NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON).");
      return;
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        await loadScriptOnce(getHostfullyPikadayScriptSrc());
        if (cancelled) return;
        await loadScriptOnce(getHostfullyLeadCaptureScriptSrc());
        if (cancelled) return;
        const W = window.Widget;
        if (typeof W !== "function") {
          setError("Hostfully: `Widget` no está disponible tras cargar los scripts.");
          return;
        }
        new W(containerId, widgetUuid.trim(), options);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error cargando widget Hostfully");
        }
      }
    })();

    return () => {
      cancelled = true;
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [containerId, widgetUuid, options]);

  if (!widgetUuid.trim()) {
    return null;
  }

  if (!options) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900 text-base">
            Widget Lead Hostfully sin configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 space-y-2">
          <p>
            Pega en el admin el JSON del tercer argumento de{" "}
            <code className="rounded bg-amber-100 px-1">new Widget(...)</code>, o define{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_HOSTFULLY_LEAD_WIDGET_OPTIONS_JSON
            </code>{" "}
            en el entorno.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("hostfully-lead-widget-embed space-y-3", className)}>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div
        id={containerId}
        className="rounded-lg border border-gray-200 bg-white p-2 min-h-[200px]"
      />
    </div>
  );
}
