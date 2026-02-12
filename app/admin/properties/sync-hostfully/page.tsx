"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { syncHostfullyProperties } from "./actions";

export default function SyncHostfullyPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const result = await syncHostfullyProperties();
      if (result.success) {
        toast.success(
          `Sincronización completada: ${result.created} creadas, ${result.updated} actualizadas`
        );
      } else {
        toast.error(result.error ?? "Error al sincronizar");
      }
    } catch {
      toast.error("Error al sincronizar con Hostfully");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost">
          <Link href="/admin/properties">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Propiedades
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sincronizar con Hostfully</h1>
        <p className="text-gray-600">
          Importa o actualiza las propiedades desde tu PMS Hostfully.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Importar propiedades
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Las propiedades existentes (vinculadas por Hostfully UID) se actualizarán.
            Las nuevas se crearán en Firestore con hostfullyPropertyId para que la
            disponibilidad y el feed iCal usen el PMS.
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar ahora
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
