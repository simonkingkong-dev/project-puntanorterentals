"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { syncRevyoosReviewsAction } from "@/app/admin/testimonials/revyoos-actions";
import type { RevyoosSyncResult } from "@/lib/revyoos/sync";

interface RevyoosSyncPanelProps {
  propertyTitleById: Record<string, string>;
}

export default function RevyoosSyncPanel({ propertyTitleById }: RevyoosSyncPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RevyoosSyncResult | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const res = await syncRevyoosReviewsAction();
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      toast.success(`Sincronizado: ${res.result.imported} reseñas importadas/actualizadas`);
    });
  };

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-orange-600" />
          Sincronización de reseñas Revyoos
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Trae las reseñas reales de Airbnb, Booking y Google conectadas en tu cuenta Revyoos y las
          asigna a cada propiedad según su &quot;Id de holding en Revyoos&quot; (pestaña Hostfully del
          editor de propiedad). Se puede correr las veces que haga falta: nunca duplica.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSync} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar ahora
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/testimonials/revyoos">Gestionar reseñas importadas →</Link>
          </Button>
        </div>

        {result ? (
          <div className="text-sm space-y-2">
            <p className="text-gray-700">
              {result.totalFetched} reseñas encontradas en Revyoos · {result.imported} guardadas.
            </p>
            {Object.keys(result.byProperty).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(result.byProperty)
                  .sort((a, b) => b[1] - a[1])
                  .map(([propertyId, count]) => (
                    <div key={propertyId} className="flex justify-between text-gray-600">
                      <span>{propertyTitleById[propertyId] ?? propertyId}</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                  ))}
              </div>
            ) : null}
            {result.unmappedHoldings.length > 0 ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                <p className="flex items-center gap-1.5 font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  Anuncios sin propiedad vinculada ({result.unmappedHoldings.length})
                </p>
                <p className="text-xs text-amber-800">
                  Sus reseñas no se importaron. Copia el id y pégalo en &quot;Id de holding en
                  Revyoos&quot; de la propiedad correspondiente, luego sincroniza de nuevo.
                </p>
                <ul className="text-xs text-amber-800 space-y-0.5">
                  {result.unmappedHoldings.map((h) => (
                    <li key={h.holdingId} className="font-mono">
                      {h.holdingName} — {h.holdingId} ({h.count} reseñas)
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
