"use client";

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface FileWithPreview extends File {
  preview: string;
}

interface ImageUploaderProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  existingImages?: string[];
  onRemoveExistingImage?: (url: string) => void;
  folder: string; // <-- CORRECCIÓN: Añadir esta línea
}

export default function ImageUploader({ 
  files, 
  onFilesChange, 
  existingImages = [], 
  onRemoveExistingImage,
  folder // <-- No usamos 'folder' aquí, pero es necesario para que Typescript lo acepte
}: ImageUploaderProps) {

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any) => {
    if (fileRejections.length > 0) {
      toast.error(fileRejections[0].errors[0].message);
      return;
    }

    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    maxSize: 5 * 1024 * 1024, // Límite de 5MB
  });

  const handleRemoveFile = (fileName: string) => {
    const newFiles = files.filter(file => file.name !== fileName);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* --- El Dropzone --- */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-orange-600 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}
        `}
      >
        <input {...getInputProps()} />
        <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
        {isDragActive ?
          <p className="mt-2 text-orange-600">Suelta las imágenes aquí...</p> :
          <p className="mt-2 text-gray-500">Arrastra y suelta imágenes, o haz clic para seleccionar (Máx 5MB)</p>
        }
      </div>

      {/* --- Cola de Archivos (Listos para subir) --- */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Nuevas imágenes (en cola):</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {files.map(file => (
              <div key={file.name} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element -- Preview usa blob URL */}
                <img src={file.preview} alt={file.name} className="w-full h-24 object-cover rounded" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100"
                  onClick={() => handleRemoveFile(file.name)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Imágenes Ya Subidas (Solo para 'Editar') --- */}
      {existingImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Imágenes actuales:</h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {existingImages.map((url) => (
              <div key={url} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element -- Galería de URLs existentes en admin */}
                <img src={url} alt="Imagen de la propiedad" className="w-full h-24 object-cover rounded" />
                {onRemoveExistingImage && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-70 group-hover:opacity-100"
                    onClick={() => onRemoveExistingImage(url)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}