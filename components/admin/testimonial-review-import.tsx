"use client";

import { useCallback, useRef, useState } from "react";
import { ClipboardPaste, Loader2, ScanLine, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractTestimonialFromReviewScreenshot } from "@/app/admin/testimonials/review-import-actions";
import type { ExtractedTestimonialFields } from "@/lib/review-screenshot-extract";

export type TestimonialImportDraft = {
  name: string;
  text: string;
  rating: number;
  location: string;
};

interface TestimonialReviewImportProps {
  onImported: (draft: TestimonialImportDraft) => void;
}

export default function TestimonialReviewImport({ onImported }: TestimonialReviewImportProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const pasteRef = useRef<HTMLDivElement>(null);

  const revokePreview = useCallback(() => {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const applyExtracted = useCallback(
    (data: ExtractedTestimonialFields) => {
      onImported({
        name: data.name,
        text: data.text,
        rating: data.rating,
        location: data.location ?? "",
      });
    },
    [onImported]
  );

  const analyzeFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("El archivo debe ser una imagen");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error("La imagen no puede superar 8 MB");
        return;
      }

      revokePreview();
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      setAnalyzing(true);

      try {
        const fd = new FormData();
        fd.append("screenshot", file);
        const result = await extractTestimonialFromReviewScreenshot(fd);
        if (!result.success || !result.data) {
          toast.error(result.error ?? "No se pudo analizar la captura");
          return;
        }
        applyExtracted(result.data);
        toast.success("Reseña analizada. Revisa los campos abajo antes de guardar.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error inesperado");
      } finally {
        setAnalyzing(false);
      }
    },
    [applyExtracted, revokePreview]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void analyzeFile(file);
    e.target.value = "";
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) await analyzeFile(file);
          return;
        }
      }
    },
    [analyzeFile]
  );

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-orange-600" />
          Importar desde captura de reseña
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Toma foto o captura de pantalla de la reseña completa (Airbnb, Google, Booking, etc.).
          La IA extrae nombre, texto, estrellas y ubicación para rellenar el testimonio. Luego
          revisa y pulsa Crear.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="testimonial-review-screenshot">Subir captura</Label>
          <Input
            id="testimonial-review-screenshot"
            type="file"
            accept="image/*"
            className="mt-1"
            disabled={analyzing}
            onChange={handleFileChange}
          />
        </div>

        <div
          ref={pasteRef}
          tabIndex={0}
          role="textbox"
          aria-label="Pegar captura de reseña"
          onPaste={handlePaste}
          className="rounded-lg border border-dashed border-orange-300 bg-white px-4 py-8 text-center text-sm text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
        >
          {analyzing ? (
            <span className="inline-flex items-center gap-2 text-orange-800">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analizando reseña con IA...
            </span>
          ) : (
            <>
              <ClipboardPaste className="mx-auto mb-2 h-6 w-6 text-orange-500" />
              Haz clic aquí y pega (Ctrl+V) la captura de la reseña entera
            </>
          )}
        </div>

        {preview ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="relative w-full sm:max-w-xs rounded-lg border overflow-hidden bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Captura analizada" className="w-full h-auto object-contain" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={analyzing}
              onClick={() => {
                const input = document.getElementById(
                  "testimonial-review-screenshot"
                ) as HTMLInputElement | null;
                input?.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Analizar otra captura
            </Button>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Requiere <code className="text-xs">GEMINI_API_KEY</code> en el servidor (.env.local).
        </p>
      </CardContent>
    </Card>
  );
}
