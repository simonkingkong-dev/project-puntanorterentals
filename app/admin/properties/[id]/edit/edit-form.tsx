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
import {
  DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT,
  DEFAULT_INCLUDED_GUESTS,
} from "@/lib/pricing-guests";
import { handleUpdateProperty, UpdatePropertyFormData } from "../../actions";
import ImageUploader, { FileWithPreview } from "@/components/admin/image-uploader";
import { uploadImageToStorage } from "@/lib/firebase/storage";

// Lista de amenidades comunes
const commonAmenities = [
  'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
  'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
  'Seguridad 24/7', 'Acceso a playa', 'Gym', 'Spa', 'Jacuzzi', 'Barbacoa', 'Jardín',
  'WiFi', 'TV', 'Smart TV', 'Cable TV', 'Heating', 'Kitchen', 'Kitchenette',
  'Pool', 'Parking', 'Free Parking', 'Beach Access', 'Downtown',
  'Hot Water', 'Towels', 'Cooking Basics', 'Pots and Pans', 'Desk',
  'Lock on Bedroom Door', 'Washer', 'Dryer', 'Hair Dryer', 'Refrigerator',
  'Microwave', 'Coffee Maker', 'BBQ Grill', 'Patio / Balcony',
  'Private Entrance', 'Smoke Detector', 'Carbon Monoxide Detector',
  'First Aid Kit', 'Fire Extinguisher', 'Pets Allowed', 'Smoking Allowed',
  'Events Allowed',
];

interface PropertyEditFormProps {
  initialData: Property;
}

const isNextRedirectError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeDigest = (error as { digest?: unknown }).digest;
  return typeof maybeDigest === "string" && maybeDigest.startsWith("NEXT_REDIRECT");
};

/** Campos numéricos de widgets como string en inputs HTML. */
type PropertyEditFormState = Omit<
  UpdatePropertyFormData,
  | "images"
  | "hostfullyCalendarWidgetId"
  | "hostfullyCalendarShowTentative"
  | "hostfullyCalendarMonthsToDisplay"
> & {
  hostfullyCalendarWidgetId: string;
  hostfullyCalendarShowTentative: string;
  hostfullyCalendarMonthsToDisplay: string;
};

export default function PropertyEditForm({ initialData }: PropertyEditFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [contentLang, setContentLang] = useState<'es' | 'en'>('es');
  
  // 1. El estado del formulario principal
  const [formData, setFormData] = useState<PropertyEditFormState>({
    internalName: initialData.internalName ?? '',
    titleEs: initialData.titleEs ?? initialData.title ?? '',
    titleEn: initialData.titleEn ?? '',
    title: initialData.title,
    description: initialData.description,
    location: initialData.location,
    maxGuests: initialData.maxGuests,
    pricePerNight: initialData.pricePerNight,
    includedGuests: initialData.includedGuests ?? DEFAULT_INCLUDED_GUESTS,
    extraGuestFeePerNight:
      initialData.extraGuestFeePerNight ?? DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT,
    featured: initialData.featured,
    amenities: initialData.amenities,
    hostfullyPropertyId: initialData.hostfullyPropertyId ?? '',
    hostfullyLeadWidgetUuid: initialData.hostfullyLeadWidgetUuid ?? '',
    hostfullyLeadWidgetOptionsJson: initialData.hostfullyLeadWidgetOptionsJson ?? '',
    hostfullyCalendarWidgetId:
      initialData.hostfullyCalendarWidgetId != null
        ? String(initialData.hostfullyCalendarWidgetId)
        : '',
    hostfullyCalendarWidgetName: initialData.hostfullyCalendarWidgetName ?? '',
    hostfullyCalendarShowTentative:
      initialData.hostfullyCalendarShowTentative != null
        ? String(initialData.hostfullyCalendarShowTentative)
        : '',
    hostfullyCalendarMonthsToDisplay:
      initialData.hostfullyCalendarMonthsToDisplay != null
        ? String(initialData.hostfullyCalendarMonthsToDisplay)
        : '',
    shortDescription: initialData.shortDescription ?? '',
    shortDescriptionEs: initialData.shortDescriptionEs ?? '',
    shortDescriptionEn: initialData.shortDescriptionEn ?? '',
    longDescription: initialData.longDescription ?? '',
    longDescriptionEs: initialData.longDescriptionEs ?? '',
    longDescriptionEn: initialData.longDescriptionEn ?? '',
    notes: initialData.notes ?? '',
    notesEs: initialData.notesEs ?? '',
    notesEn: initialData.notesEn ?? '',
    interaction: initialData.interaction ?? '',
    interactionEs: initialData.interactionEs ?? '',
    interactionEn: initialData.interactionEn ?? '',
    neighborhood: initialData.neighborhood ?? '',
    neighborhoodEs: initialData.neighborhoodEs ?? '',
    neighborhoodEn: initialData.neighborhoodEn ?? '',
    access: initialData.access ?? '',
    accessEs: initialData.accessEs ?? '',
    accessEn: initialData.accessEn ?? '',
    space: initialData.space ?? '',
    spaceEs: initialData.spaceEs ?? '',
    spaceEn: initialData.spaceEn ?? '',
    transit: initialData.transit ?? '',
    transitEs: initialData.transitEs ?? '',
    transitEn: initialData.transitEn ?? '',
    houseManual: initialData.houseManual ?? '',
    houseManualEs: initialData.houseManualEs ?? '',
    houseManualEn: initialData.houseManualEn ?? '',
    descriptionEs: initialData.descriptionEs ?? '',
    descriptionEn: initialData.descriptionEn ?? '',
    summaryEs: initialData.summaryEs ?? '',
    summaryEn: initialData.summaryEn ?? '',
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

  const getLangValue = (
    baseKey: string,
    esKey: string,
    enKey: string
  ): string => {
    const active = contentLang === 'es' ? esKey : enKey;
    const value = (formData as Record<string, unknown>)[active];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    const base = (formData as Record<string, unknown>)[baseKey];
    return typeof base === 'string' ? base : '';
  };

  const setLangValue = (
    baseKey: string,
    esKey: string,
    enKey: string,
    value: string
  ) => {
    const active = contentLang === 'es' ? esKey : enKey;
    setFormData(prev => ({
      ...prev,
      [baseKey]: value,
      [active]: value,
    }));
  };

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

      const {
        hostfullyCalendarWidgetId: calWidgetIdStr,
        hostfullyCalendarShowTentative: calStStr,
        hostfullyCalendarMonthsToDisplay: calMdStr,
        ...formRest
      } = formData;

      const calIdRaw = calWidgetIdStr?.trim();
      const calId =
        calIdRaw && !Number.isNaN(Number(calIdRaw)) ? Number(calIdRaw) : undefined;
      const stRaw = calStStr?.trim() ?? "";
      const mdRaw = calMdStr?.trim() ?? "";

      const leadOptsRaw = formData.hostfullyLeadWidgetOptionsJson?.trim();
      if (leadOptsRaw) {
        try {
          JSON.parse(leadOptsRaw);
        } catch {
          toast.error('El JSON de opciones del widget Lead no es válido');
          setIsPending(false);
          return;
        }
      }

      const propertyData: UpdatePropertyFormData = {
        ...formRest,
        internalName: formData.internalName?.trim() || undefined,
        titleEs: formData.titleEs?.trim() || undefined,
        titleEn: formData.titleEn?.trim() || undefined,
        title: formData.titleEs?.trim() || formData.title?.trim() || '',
        images: finalImageUrls,
        hostfullyPropertyId: formData.hostfullyPropertyId?.trim() || undefined,
        hostfullyLeadWidgetUuid: formData.hostfullyLeadWidgetUuid?.trim() || undefined,
        hostfullyLeadWidgetOptionsJson:
          formData.hostfullyLeadWidgetOptionsJson?.trim() || undefined,
        hostfullyCalendarWidgetId: calId,
        hostfullyCalendarWidgetName:
          formData.hostfullyCalendarWidgetName?.trim() || undefined,
        hostfullyCalendarShowTentative:
          stRaw !== "" && !Number.isNaN(Number(stRaw)) ? Number(stRaw) : undefined,
        hostfullyCalendarMonthsToDisplay:
          mdRaw !== "" && !Number.isNaN(Number(mdRaw)) ? Number(mdRaw) : undefined,
      };

      const result = await handleUpdateProperty(initialData.id, propertyData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Propiedad actualizada exitosamente.");
      }
    } catch (error) {
      if (isNextRedirectError(error)) {
        return;
      }
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
      {/* Submit superior sticky */}
      <div className="sticky top-3 z-20 flex gap-4 rounded-lg border bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Idioma de contenido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex rounded-md border border-gray-200 p-1 gap-1 bg-gray-50">
            <Button
              type="button"
              variant={contentLang === 'es' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setContentLang('es')}
            >
              Español
            </Button>
            <Button
              type="button"
              variant={contentLang === 'en' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setContentLang('en')}
            >
              English
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Editas textos en {contentLang === 'es' ? 'Español' : 'English'}. El frontend mostrará automáticamente el idioma seleccionado por el visitante.
          </p>
        </CardContent>
      </Card>

      {/* Card de Información Básica (sin cambios) */}
      <Card>
        <CardHeader><CardTitle>Información Básica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="internalName">Nombre interno (solo admin)</Label>
              <Input
                id="internalName"
                value={formData.internalName ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, internalName: e.target.value }))
                }
                placeholder="Ej: Casa Naranja Principal / Unidad A"
              />
              <p className="text-xs text-muted-foreground">
                Este nombre es solo para operación interna. No se muestra a los clientes.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="titleEs">Título (ES) *</Label>
              <Input
                id="titleEs"
                value={formData.titleEs ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    titleEs: e.target.value,
                    title: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="titleEn">Title (EN) *</Label>
              <Input
                id="titleEn"
                value={formData.titleEn ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                required
              />
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
            <Label htmlFor="description">
              {contentLang === 'es' ? 'Descripción *' : 'Description *'}
            </Label>
            <Textarea
              id="description"
              value={getLangValue('description', 'descriptionEs', 'descriptionEn')}
              onChange={(e) => setLangValue('description', 'descriptionEs', 'descriptionEn', e.target.value)}
              rows={4}
              required
            />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="includedGuests">Huéspedes incluidos en la tarifa</Label>
              <Input
                id="includedGuests"
                type="number"
                min="1"
                value={formData.includedGuests}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    includedGuests: parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extraGuestFeePerNight">Cargo extra / huésped / noche (USD)</Label>
              <Input
                id="extraGuestFeePerNight"
                type="number"
                min="0"
                step="0.01"
                value={formData.extraGuestFeePerNight}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    extraGuestFeePerNight: parseFloat(e.target.value) || 0,
                  }))
                }
              />
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

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-gray-900">Widget Lead / reserva (leadCaptureWidget)</p>
            <p className="text-xs text-muted-foreground">
              Pega el UUID del snippet (2º argumento de <code className="rounded bg-muted px-1">new Widget</code>).
              Ideal: snippet por propiedad en Hostfully, no solo agencia.
            </p>
            <Label htmlFor="hostfullyLeadWidgetUuid">UUID del widget Lead</Label>
            <Input
              id="hostfullyLeadWidgetUuid"
              value={formData.hostfullyLeadWidgetUuid ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, hostfullyLeadWidgetUuid: e.target.value }))
              }
              placeholder="bd250250-08a1-49d8-b2ee-d49588fbaf9d"
            />
            <Label htmlFor="hostfullyLeadWidgetOptionsJson">JSON de opciones (3º argumento de Widget)</Label>
            <Textarea
              id="hostfullyLeadWidgetOptionsJson"
              rows={6}
              className="font-mono text-xs"
              value={formData.hostfullyLeadWidgetOptionsJson ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hostfullyLeadWidgetOptionsJson: e.target.value,
                }))
              }
              placeholder='{"type":"property",...}'
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-gray-900">Widget calendario Orbi (opcional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostfullyCalendarWidgetId">Id numérico del calendario</Label>
                <Input
                  id="hostfullyCalendarWidgetId"
                  inputMode="numeric"
                  value={formData.hostfullyCalendarWidgetId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hostfullyCalendarWidgetId: e.target.value,
                    }))
                  }
                  placeholder="179135"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostfullyCalendarWidgetName">Nombre en el calendario</Label>
                <Input
                  id="hostfullyCalendarWidgetName"
                  value={formData.hostfullyCalendarWidgetName ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hostfullyCalendarWidgetName: e.target.value,
                    }))
                  }
                  placeholder="01 Casa Naranja"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostfullyCalendarShowTentative">showTentative (0/1)</Label>
                <Input
                  id="hostfullyCalendarShowTentative"
                  inputMode="numeric"
                  value={formData.hostfullyCalendarShowTentative}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hostfullyCalendarShowTentative: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostfullyCalendarMonthsToDisplay">Meses a mostrar</Label>
                <Input
                  id="hostfullyCalendarMonthsToDisplay"
                  inputMode="numeric"
                  value={formData.hostfullyCalendarMonthsToDisplay}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      hostfullyCalendarMonthsToDisplay: e.target.value,
                    }))
                  }
                  placeholder="2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido Hostfully (secciones de texto avanzadas) */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido Hostfully</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mostrando campos para: <strong>{contentLang === 'es' ? 'Español' : 'English'}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea
                id="shortDescription"
                rows={3}
                value={getLangValue('shortDescription', 'shortDescriptionEs', 'shortDescriptionEn')}
                onChange={(e) => setLangValue('shortDescription', 'shortDescriptionEs', 'shortDescriptionEn', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longDescription">Long Description</Label>
              <Textarea
                id="longDescription"
                rows={3}
                value={getLangValue('longDescription', 'longDescriptionEs', 'longDescriptionEn')}
                onChange={(e) => setLangValue('longDescription', 'longDescriptionEs', 'longDescriptionEn', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={getLangValue('notes', 'notesEs', 'notesEn')}
              onChange={(e) => setLangValue('notes', 'notesEs', 'notesEn', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interaction">Interaction</Label>
              <Textarea
                id="interaction"
                rows={3}
                value={getLangValue('interaction', 'interactionEs', 'interactionEn')}
                onChange={(e) => setLangValue('interaction', 'interactionEs', 'interactionEn', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Textarea
                id="neighborhood"
                rows={3}
                value={getLangValue('neighborhood', 'neighborhoodEs', 'neighborhoodEn')}
                onChange={(e) => setLangValue('neighborhood', 'neighborhoodEs', 'neighborhoodEn', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="access">Access</Label>
              <Textarea
                id="access"
                rows={3}
                value={getLangValue('access', 'accessEs', 'accessEn')}
                onChange={(e) => setLangValue('access', 'accessEs', 'accessEn', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space">Space</Label>
              <Textarea
                id="space"
                rows={3}
                value={getLangValue('space', 'spaceEs', 'spaceEn')}
                onChange={(e) => setLangValue('space', 'spaceEs', 'spaceEn', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transit">Transit</Label>
              <Textarea
                id="transit"
                rows={3}
                value={getLangValue('transit', 'transitEs', 'transitEn')}
                onChange={(e) => setLangValue('transit', 'transitEs', 'transitEn', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="houseManual">House Manual</Label>
            <Textarea
              id="houseManual"
              rows={3}
              value={getLangValue('houseManual', 'houseManualEs', 'houseManualEn')}
              onChange={(e) => setLangValue('houseManual', 'houseManualEs', 'houseManualEn', e.target.value)}
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