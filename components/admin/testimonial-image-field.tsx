"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uploadImageToStorage } from "@/lib/firebase/storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface TestimonialImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  id?: string;
}

export default function TestimonialImageField({
  value,
  onChange,
  id = "testimonial-image",
}: TestimonialImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<string | null>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  const displayUrl = previewBlob || value;

  useEffect(() => {
    return () => {
      if (previewBlob) URL.revokeObjectURL(previewBlob);
    };
  }, [previewBlob]);

  const clearPreviewBlob = useCallback(() => {
    setPreviewBlob((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("El archivo debe ser una imagen");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("La imagen no puede superar 5 MB");
        return;
      }

      setUploading(true);
      const localPreview = URL.createObjectURL(file);
      setPreviewBlob((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return localPreview;
      });

      try {
        const url = await uploadImageToStorage(file, "testimonials");
        onChange(url);
        URL.revokeObjectURL(localPreview);
        setPreviewBlob(null);
        toast.success("Imagen subida");
      } catch {
        toast.error("No se pudo subir la imagen");
        URL.revokeObjectURL(localPreview);
        setPreviewBlob(null);
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
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
          if (file) await uploadFile(file);
          return;
        }
      }

      const text = e.clipboardData.getData("text/plain")?.trim();
      if (text && /^https?:\/\/.+/i.test(text)) {
        e.preventDefault();
        clearPreviewBlob();
        onChange(text);
        toast.success("URL pegada");
      }
    },
    [clearPreviewBlob, onChange, uploadFile]
  );

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearPreviewBlob();
    onChange(e.target.value);
  };

  const clearImage = () => {
    clearPreviewBlob();
    onChange("");
  };

  return (
    <div className="space-y-3">
      <Label>Foto del cliente (opcional, avatar)</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        No uses esto para la captura de la reseña: importa la reseña arriba con IA.
      </p>

      {displayUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa admin con blob o URL externa */}
          <img
            src={displayUrl}
            alt="Vista previa"
            className="h-16 w-16 rounded-full border object-cover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearImage}
            disabled={uploading}
          >
            <X className="mr-1 h-4 w-4" />
            Quitar
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${id}-url`} className="text-sm font-normal text-muted-foreground">
          URL
        </Label>
        <Input
          id={`${id}-url`}
          type="url"
          value={value}
          onChange={handleUrlChange}
          placeholder="https://example.com/photo.jpg"
          disabled={uploading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-file`} className="text-sm font-normal text-muted-foreground">
          Subir archivo
        </Label>
        <Input
          id={`${id}-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP o GIF. Máximo 5 MB.</p>
      </div>

      <div
        ref={pasteZoneRef}
        tabIndex={0}
        role="textbox"
        aria-label="Pegar imagen desde el portapapeles"
        onPaste={handlePaste}
        className="rounded-lg border border-dashed border-gray-300 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo imagen...
          </span>
        ) : (
          <>
            <ClipboardPaste className="mx-auto mb-2 h-5 w-5 text-gray-400" />
            Haz clic aquí y pega (Ctrl+V) una imagen del portapapeles
          </>
        )}
      </div>
    </div>
  );
}
