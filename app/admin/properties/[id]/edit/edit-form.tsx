"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Plus, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Property } from "@/lib/types";
import { handleUpdateProperty, UpdatePropertyFormData } from "../../actions";
import ImageUploader, { FileWithPreview } from "@/components/admin/image-uploader";
import { uploadImageToStorage } from "@/lib/firebase/storage";

// Lista de amenidades comunes
const commonAmenities = [
  'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
  'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
  'Seguridad 24/7', 'Acceso a playa', 'Gym', 'Spa', 'Jacuzzi', 'Barbacoa', 'Jardín',
];

interface PropertyEditFormProps {
  initialData: Property;
}

export default function PropertyEditForm({ initialData }: PropertyEditFormProps) {
  const [isPending, setIsPending] = useState(false);
  
  // 1. El estado del formulario principal
  const [formData, setFormData] = useState<Omit<UpdatePropertyFormData, 'images'>>({
    title: initialData.title,
    description: initialData.description,
    location: initialData.location,
    maxGuests: initialData.maxGuests,
    pricePerNight: initialData.pricePerNight,
    featured: initialData.featured,
    amenities: initialData.amenities,
    hostfullyPropertyId: initialData.hostfullyPropertyId ?? '',
    shortDescription: initialData.shortDescription ?? '',
    longDescription: initialData.longDescription ?? '',
    notes: initialData.notes ?? '',
    interaction: initialData.interaction ?? '',
    neighborhood: initialData.neighborhood ?? '',
    access: initialData.access ?? '',
    space: initialData.space ?? '',
    transit: initialData.transit ?? '',
    houseManual: initialData.houseManual ?? '',
    latitude: initialData.latitude,
    longitude: initialData.longitude,
  });

  // --- CORREGIDO: Estados separados para imágenes ---
  // Estado para las URLs de imágenes que ya están en Firebase
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialData.images ?? []);
  // Estado para los *archivos* nuevos que se van a subir
  const [newImageFiles, setNewImageFiles] = useState<FileWithPreview[]>([]);
  // ---
  
  const [newAmenity, setNewAmenity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((existingImageUrls.length + newImageFiles.length) === 0) {
      toast.error('Agrega al menos una imagen');
      return;
    }
    setIsPending(true);
    try {
      let finalImageUrls = [...existingImageUrls];

      if (newImageFiles.length > 0) {
        toast.info("Subiendo nuevas imágenes...");
        const uploadPromises = newImageFiles.map(file =>
          uploadImageToStorage(file, 'properties')
        );
        const newUrls = await Promise.all(uploadPromises);
        finalImageUrls = [...existingImageUrls, ...newUrls];
      }

      const propertyData: UpdatePropertyFormData = {
        ...formData,
        images: finalImageUrls,
        hostfullyPropertyId: formData.hostfullyPropertyId?.trim() || undefined,
      };

      const result = await handleUpdateProperty(initialData.id, propertyData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Propiedad actualizada exitosamente.");
      }
    } catch (error) {
      console.error("Error al actualizar la propiedad:", error);
      toast.error("Error al subir las imágenes. Revisa la consola.");
    } finally {
      setIsPending(false);
    }
  };

  // --- Lógica de Amenidades (sin cambios) ---
  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities?.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenity]
      }));
    }
  };
  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities?.filter(a => a !== amenity)
    }));
  };
  // --- Fin Lógica de Amenidades ---

  // --- CORREGIDO: Nueva función para borrar imágenes existentes ---
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImageUrls(prevUrls => prevUrls.filter(url => url !== urlToRemove));
    // Nota: Esto no borra el archivo de Firebase Storage, solo de la propiedad.
    // Implementar la eliminación de Storage es un paso más avanzado.
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card de Información Básica (sin cambios) */}
      <Card>
        <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input id="location" value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitud (para mapa)</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={formData.latitude ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    latitude: value === '' ? undefined : parseFloat(value),
                  }));
                }}
                placeholder="Ej: 21.257900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitud (para mapa)</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={formData.longitude ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    longitude: value === '' ? undefined : parseFloat(value),
                  }));
                }}
                placeholder="Ej: -86.748100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={4} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxGuests">Máximo de Huéspedes</Label>
              <Input id="maxGuests" type="number" min="1" value={formData.maxGuests} onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerNight">Precio por Noche ($)</Label>
              <Input id="pricePerNight" type="number" min="1" value={formData.pricePerNight} onChange={(e) => setFormData(prev => ({ ...prev, pricePerNight: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-2">
              <Label>Propiedad Destacada</Label>
              <div className="flex items-center space-x-2">
                <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))} />
                <span className="text-sm text-gray-600">{formData.featured ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Amenidades (sin cambios) */}
      <Card>
        <CardHeader><CardTitle>Amenidades</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {formData.amenities && formData.amenities.length > 0 && (
            <div className="space-y-2">
              <Label>Amenidades Seleccionadas</Label>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <button type="button" onClick={() => removeAmenity(amenity)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Amenidades Comunes</Label>
            <div className="flex flex-wrap gap-2">
              {commonAmenities
                .filter(amenity => !formData.amenities?.includes(amenity))
                .map((amenity) => (
                  <Button key={amenity} type="button" variant="outline" size="sm" onClick={() => addAmenity(amenity)}>
                    <Plus className="w-3 h-3 mr-1" />
                    {amenity}
                  </Button>
                ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Agregar Amenidad Personalizada</Label>
            <div className="flex gap-2">
              <Input value={newAmenity} onChange={(e) => setNewAmenity(e.target.value)} placeholder="Nombre de la amenidad" />
              <Button type="button" onClick={() => { addAmenity(newAmenity); setNewAmenity(''); }} disabled={!newAmenity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integración Hostfully (PMS) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Integración Hostfully (PMS)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Si vinculas esta propiedad con Hostfully, la disponibilidad y el feed iCal se consultarán al PMS.
            Deja vacío para usar Firestore.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hostfullyPropertyId">UID de Propiedad en Hostfully</Label>
            <Input
              id="hostfullyPropertyId"
              value={formData.hostfullyPropertyId ?? ''}
              onChange={(e) => setFormData(prev => ({ ...prev, hostfullyPropertyId: e.target.value }))}
              placeholder="Ej: abc123-def456-..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Contenido Hostfully (secciones de texto avanzadas) */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido Hostfully</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea
                id="shortDescription"
                rows={3}
                value={formData.shortDescription ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, shortDescription: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longDescription">Long Description</Label>
              <Textarea
                id="longDescription"
                rows={3}
                value={formData.longDescription ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, longDescription: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={formData.notes ?? ''}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interaction">Interaction</Label>
              <Textarea
                id="interaction"
                rows={3}
                value={formData.interaction ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, interaction: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Textarea
                id="neighborhood"
                rows={3}
                value={formData.neighborhood ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, neighborhood: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="access">Access</Label>
              <Textarea
                id="access"
                rows={3}
                value={formData.access ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, access: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space">Space</Label>
              <Textarea
                id="space"
                rows={3}
                value={formData.space ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, space: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transit">Transit</Label>
              <Textarea
                id="transit"
                rows={3}
                value={formData.transit ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, transit: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="houseManual">House Manual</Label>
            <Textarea
              id="houseManual"
              rows={3}
              value={formData.houseManual ?? ''}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, houseManual: e.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Card de Imágenes */}
      <Card>
         <CardHeader>
          <CardTitle>Galería de Imágenes</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploader
            files={newImageFiles}
            onFilesChange={setNewImageFiles}
            existingImages={existingImageUrls}
            onRemoveExistingImage={handleRemoveExistingImage}
            folder="properties" 
          />
        </CardContent>
       </Card>

      {/* Submit (sin cambios) */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>
          )}
        </Button>
      </div>
    </form>
  );
}