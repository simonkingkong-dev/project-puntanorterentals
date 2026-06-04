"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { GripVertical, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** @deprecated Usar galería unificada con `images` + `onAddFiles`. */
export interface FileWithPreview extends File {
  preview: string;
}

interface ImageUploaderProps {
  /** URLs en orden de visualización (Firebase o blob local antes de crear propiedad). */
  images: string[];
  onImagesChange: (images: string[]) => void;
  onRemoveImage?: (url: string) => void;
  /** Sube archivos y añade las URLs devueltas al final (editar: subida inmediata). */
  onAddFiles?: (files: File[]) => Promise<void>;
  uploading?: boolean;
  /** Solo compatibilidad con props antiguas; la subida la hace `onAddFiles`. */
  folder?: string;
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function ImageUploader({
  images,
  onImagesChange,
  onRemoveImage,
  onAddFiles,
  uploading = false,
  folder: _folder,
}: ImageUploaderProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const canReorder = images.length > 1;

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast.error(fileRejections[0].errors[0].message);
        return;
      }
      if (acceptedFiles.length === 0) return;

      if (onAddFiles) {
        await onAddFiles(acceptedFiles);
        return;
      }

      const blobUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
      onImagesChange([...images, ...blobUrls]);
    },
    [images, onAddFiles, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files, rejections) => {
      void onDrop(files, rejections);
    },
    accept: { "image/*": [".jpeg", ".png", ".jpg", ".webp"] },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
  });

  const handleRemove = (url: string) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
    if (onRemoveImage) {
      onRemoveImage(url);
    } else {
      onImagesChange(images.filter((u) => u !== url));
    }
  };

  const handleDropReorder = (toIndex: number) => {
    if (draggingIndex === null) return;
    onImagesChange(reorderList(images, draggingIndex, toIndex));
    setDraggingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}
          ${isDragActive ? "border-orange-600 bg-orange-50" : "border-gray-300 hover:border-gray-400"}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-12 h-12 mx-auto text-orange-500 animate-spin" />
        ) : (
          <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
        )}
        {uploading ? (
          <p className="mt-2 text-orange-600">Subiendo imágenes...</p>
        ) : isDragActive ? (
          <p className="mt-2 text-orange-600">Suelta las imágenes aquí...</p>
        ) : (
          <p className="mt-2 text-gray-500">
            Arrastra y suelta imágenes, o haz clic para seleccionar (Máx 5MB). Se añaden a la
            galería de inmediato.
          </p>
        )}
      </div>

      {canReorder ? (
        <p className="text-sm text-muted-foreground">
          Arrastra las miniaturas para cambiar el orden. La primera imagen es la portada en el
          sitio.
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-semibold">Galería ({images.length})</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={`relative group rounded overflow-hidden border bg-muted/20 ${
                  draggingIndex === index ? "ring-2 ring-primary opacity-80" : ""
                } ${canReorder ? "cursor-grab active:cursor-grabbing" : ""}`}
                draggable={canReorder}
                onDragStart={() => setDraggingIndex(index)}
                onDragOver={(e) => canReorder && e.preventDefault()}
                onDrop={(e) => {
                  if (!canReorder) return;
                  e.preventDefault();
                  handleDropReorder(index);
                }}
                onDragEnd={() => setDraggingIndex(null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Galería admin */}
                <img src={url} alt="" className="w-full h-24 object-cover" />
                <div className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index + 1}
                </div>
                {canReorder ? (
                  <div className="pointer-events-none absolute top-1 left-1 rounded bg-black/50 p-0.5 text-white">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100"
                  onClick={() => handleRemove(url)}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no hay imágenes en la galería.</p>
      )}
    </div>
  );
}
