"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, Plus, X, Link2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Property, BedType } from "@/lib/types";
import {
  DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT,
  DEFAULT_INCLUDED_GUESTS,
} from "@/lib/pricing-guests";
import {
  handleBulkAppendPropertyAmenity,
  handleBulkUpdatePropertyAmenities,
  handleUpdateProperty,
  handleUpdatePropertyAmenities,
  UpdatePropertyFormData,
} from "../../actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ImageUploader, { FileWithPreview } from "@/components/admin/image-uploader";
import { uploadImageToStorage } from "@/lib/firebase/storage";

const commonAmenitiesByLang = {
  es: [
    'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
    'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
    'Seguridad 24/7', 'Acceso a playa', 'Gimnasio', 'Spa', 'Jacuzzi', 'Barbacoa',
    'Jardín', 'TV', 'Smart TV', 'TV por cable', 'Calefacción', 'Cocina', 'Kitchenette',
    'Agua caliente', 'Toallas', 'Utensilios básicos de cocina', 'Ollas y sartenes',
    'Escritorio', 'Cerradura en la habitación', 'Lavadora', 'Secadora', 'Secador de pelo',
    'Refrigerador', 'Microondas', 'Cafetera', 'Parrilla BBQ', 'Patio / Balcón',
    'Entrada privada', 'Detector de humo', 'Detector de monóxido de carbono',
    'Botiquín de primeros auxilios', 'Extintor', 'Mascotas permitidas',
    'Permitido fumar', 'Eventos permitidos',
  ],
  en: [
    'High-speed WiFi', 'Air conditioning', 'Pool', 'Ocean view',
    'Equipped kitchen', 'Private terrace', 'Parking', 'Cleaning service',
    '24/7 security', 'Beach access', 'Gym', 'Spa', 'Jacuzzi', 'BBQ grill',
    'Garden', 'TV', 'Smart TV', 'Cable TV', 'Heating', 'Kitchen', 'Kitchenette',
    'Hot water', 'Towels', 'Cooking basics', 'Pots and pans', 'Desk',
    'Lock on bedroom door', 'Washer', 'Dryer', 'Hair dryer', 'Refrigerator',
    'Microwave', 'Coffee maker', 'Patio / Balcony', 'Private entrance',
    'Smoke detector', 'Carbon monoxide detector', 'First aid kit', 'Fire extinguisher',
    'Pets allowed', 'Smoking allowed', 'Events allowed',
  ],
};

interface PropertyEditFormProps {
  initialData: Property;
}

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
  const [isAmenitiesPending, setIsAmenitiesPending] = useState(false);
  const [isBulkAmenitiesPending, setIsBulkAmenitiesPending] = useState(false);
  const [isBulkAppendPending, setIsBulkAppendPending] = useState(false);
  const initialAmenitiesByLang = useRef({
    es: [...(initialData.amenitiesEs ?? initialData.amenities ?? [])],
    en: [...(initialData.amenitiesEn ?? [])],
  });
  const [contentLang, setContentLang] = useState<'es' | 'en'>('es');
  const [amenityLang, setAmenityLang] = useState<'es' | 'en'>('es');
  const [draggingAmenityIndex, setDraggingAmenityIndex] = useState<number | null>(null);
  
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
    amenitiesEs: initialData.amenitiesEs ?? initialData.amenities ?? [],
    amenitiesEn: initialData.amenitiesEn ?? [],
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
    summary: initialData.summary ?? '',
    descriptionEs: initialData.descriptionEs ?? '',
    descriptionEn: initialData.descriptionEn ?? '',
    summaryEs: initialData.summaryEs ?? '',
    summaryEn: initialData.summaryEn ?? '',
    latitude: initialData.latitude,
    longitude: initialData.longitude,
    beds: initialData.beds ?? [],
  });

  // --- CORREGIDO: Estados separados para imágenes ---
  // Estado para las URLs de imágenes que ya están en Firebase
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialData.images ?? []);
  // Estado para los *archivos* nuevos que se van a subir
  const [newImageFiles, setNewImageFiles] = useState<FileWithPreview[]>([]);
  // ---
  
  const [newAmenity, setNewAmenity] = useState('');
  const activeAmenities =
    amenityLang === 'es'
      ? formData.amenitiesEs ?? formData.amenities ?? []
      : formData.amenitiesEn ?? [];
  const commonAmenities = commonAmenitiesByLang[amenityLang];

  const newAmenitiesSinceLoad = useMemo(() => {
    const baseline = initialAmenitiesByLang.current[amenityLang];
    return activeAmenities.filter((a) => !baseline.includes(a));
  }, [activeAmenities, amenityLang]);

  const markAmenitiesAsSavedBaseline = () => {
    initialAmenitiesByLang.current[amenityLang] = [...activeAmenities];
  };

  const markAmenityInBaseline = (amenity: string) => {
    const baseline = initialAmenitiesByLang.current[amenityLang];
    if (!baseline.includes(amenity)) {
      initialAmenitiesByLang.current[amenityLang] = [...baseline, amenity];
    }
  };

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
        amenities: _amenities,
        amenitiesEs: _amenitiesEs,
        amenitiesEn: _amenitiesEn,
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
      console.error("Error al actualizar la propiedad:", error);
      toast.error("Error al subir las imágenes. Revisa la consola.");
    } finally {
      setIsPending(false);
    }
  };

  // --- Lógica de Amenidades ---
  const setAmenitiesForActiveLang = (amenities: string[]) => {
    setFormData(prev => ({
      ...prev,
      amenities: amenityLang === 'es' ? amenities : prev.amenities ?? [],
      [amenityLang === 'es' ? 'amenitiesEs' : 'amenitiesEn']: amenities,
    }));
  };

  const addAmenity = (amenity: string) => {
    const trimmedAmenity = amenity.trim();
    if (trimmedAmenity && !activeAmenities.includes(trimmedAmenity)) {
      setAmenitiesForActiveLang([...activeAmenities, trimmedAmenity]);
    }
  };
  const removeAmenity = (amenity: string) => {
    setAmenitiesForActiveLang(activeAmenities.filter(a => a !== amenity));
  };

  const reorderAmenity = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= activeAmenities.length ||
      toIndex >= activeAmenities.length
    ) {
      return;
    }
    const updated = [...activeAmenities];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setAmenitiesForActiveLang(updated);
  };

  const saveAmenitiesForCurrentProperty = async () => {
    setIsAmenitiesPending(true);
    try {
      const result = await handleUpdatePropertyAmenities(
        initialData.id,
        amenityLang,
        activeAmenities
      );
      if (result?.error) {
        toast.error(result.error);
      } else {
        markAmenitiesAsSavedBaseline();
        toast.success(
          amenityLang === "es"
            ? "Amenidades en español guardadas en esta propiedad."
            : "English amenities saved for this property."
        );
      }
    } catch {
      toast.error("Error al guardar las amenidades.");
    } finally {
      setIsAmenitiesPending(false);
    }
  };

  const appendAmenityToAllProperties = async (amenity: string) => {
    setIsBulkAppendPending(true);
    try {
      const result = await handleBulkAppendPropertyAmenity(amenityLang, amenity);
      if (result?.error) {
        toast.error(result.error);
      } else {
        markAmenityInBaseline(amenity);
        const added = result.addedCount ?? 0;
        const skipped = result.skippedCount ?? 0;
        toast.success(
          amenityLang === "es"
            ? `"${amenity}" añadida en ${added} propiedad${added === 1 ? "" : "es"} (${skipped} ya la tenían).`
            : `"${amenity}" added to ${added} propert${added === 1 ? "y" : "ies"} (${skipped} already had it).`
        );
      }
    } catch {
      toast.error("Error al añadir la amenidad en todas las propiedades.");
    } finally {
      setIsBulkAppendPending(false);
    }
  };

  const appendAllNewAmenitiesToAllProperties = async () => {
    if (newAmenitiesSinceLoad.length === 0) return;
    setIsBulkAppendPending(true);
    try {
      let totalAdded = 0;
      let totalSkipped = 0;
      for (const amenity of newAmenitiesSinceLoad) {
        const result = await handleBulkAppendPropertyAmenity(amenityLang, amenity);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        totalAdded += result.addedCount ?? 0;
        totalSkipped += result.skippedCount ?? 0;
        markAmenityInBaseline(amenity);
      }
      toast.success(
        amenityLang === "es"
          ? `${newAmenitiesSinceLoad.length} amenidad${newAmenitiesSinceLoad.length === 1 ? "" : "es"} nuevas añadidas (${totalAdded} actualizaciones, ${totalSkipped} ya existían).`
          : `${newAmenitiesSinceLoad.length} new amenit${newAmenitiesSinceLoad.length === 1 ? "y" : "ies"} added (${totalAdded} updates, ${totalSkipped} already existed).`
      );
    } catch {
      toast.error("Error al añadir las amenidades en todas las propiedades.");
    } finally {
      setIsBulkAppendPending(false);
    }
  };

  const saveAmenitiesForAllProperties = async () => {
    setIsBulkAmenitiesPending(true);
    try {
      const result = await handleBulkUpdatePropertyAmenities(
        amenityLang,
        activeAmenities
      );
      if (result?.error) {
        toast.error(result.error);
      } else {
        markAmenitiesAsSavedBaseline();
        toast.success(
          amenityLang === "es"
            ? `Amenidades en español aplicadas a ${result.count ?? 0} propiedades.`
            : `English amenities applied to ${result.count ?? 0} properties.`
        );
      }
    } catch {
      toast.error("Error al guardar amenidades en todas las propiedades.");
    } finally {
      setIsBulkAmenitiesPending(false);
    }
  };

  // --- CORREGIDO: Nueva función para borrar imágenes existentes ---
  const handleRemoveExistingImage = (urlToRemove: string) => {
    setExistingImageUrls(prevUrls => prevUrls.filter(url => url !== urlToRemove));
    // Nota: Esto no borra el archivo de Firebase Storage, solo de la propiedad.
    // Implementar la eliminación de Storage es un paso más avanzado.
  };

  const contentFields = [
    { base: 'description', es: 'descriptionEs', en: 'descriptionEn', labelEs: 'Descripción principal', labelEn: 'Main description', rows: 5, required: true },
    { base: 'summary', es: 'summaryEs', en: 'summaryEn', labelEs: 'Resumen', labelEn: 'Summary', rows: 3, required: false },
    { base: 'shortDescription', es: 'shortDescriptionEs', en: 'shortDescriptionEn', labelEs: 'Descripción corta', labelEn: 'Short description', rows: 3, required: false },
    { base: 'longDescription', es: 'longDescriptionEs', en: 'longDescriptionEn', labelEs: 'Descripción larga', labelEn: 'Long description', rows: 4, required: false },
    { base: 'notes', es: 'notesEs', en: 'notesEn', labelEs: 'Notas', labelEn: 'Notes', rows: 3, required: false },
    { base: 'interaction', es: 'interactionEs', en: 'interactionEn', labelEs: 'Interacción con huéspedes', labelEn: 'Guest interaction', rows: 3, required: false },
    { base: 'neighborhood', es: 'neighborhoodEs', en: 'neighborhoodEn', labelEs: 'Vecindario', labelEn: 'Neighborhood', rows: 3, required: false },
    { base: 'access', es: 'accessEs', en: 'accessEn', labelEs: 'Acceso', labelEn: 'Access', rows: 3, required: false },
    { base: 'space', es: 'spaceEs', en: 'spaceEn', labelEs: 'Espacio', labelEn: 'Space', rows: 3, required: false },
    { base: 'transit', es: 'transitEs', en: 'transitEn', labelEs: 'Transporte', labelEn: 'Transit', rows: 3, required: false },
    { base: 'houseManual', es: 'houseManualEs', en: 'houseManualEn', labelEs: 'Manual de la casa', labelEn: 'House manual', rows: 3, required: false },
  ] as const;

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

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="basic" className="border data-[state=active]:border-primary">Información básica</TabsTrigger>
          <TabsTrigger value="amenities" className="border data-[state=active]:border-primary">Amenidades</TabsTrigger>
          <TabsTrigger value="content" className="border data-[state=active]:border-primary">Contenido</TabsTrigger>
          <TabsTrigger value="images" className="border data-[state=active]:border-primary">Galería de imágenes</TabsTrigger>
          <TabsTrigger value="hostfully" className="border data-[state=active]:border-primary">Integración Hostfully</TabsTrigger>
        </TabsList>

      {/* Card de Información Básica (sin cambios) */}
        <TabsContent value="basic" className="mt-0">
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

          {/* --- Bed types editor --- */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Tipos de cama</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    beds: [...(prev.beds ?? []), "double" as BedType],
                  }))
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Agregar cama
              </Button>
            </div>

            {(formData.beds ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No se han definido camas. Presiona &quot;Agregar cama&quot; para comenzar.
              </p>
            )}

            {(formData.beds ?? []).map((bed, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-8 text-sm text-muted-foreground text-right">{idx + 1}.</span>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={bed}
                  onChange={(e) => {
                    const updated = [...(formData.beds ?? [])];
                    updated[idx] = e.target.value as BedType;
                    setFormData((prev) => ({ ...prev, beds: updated }));
                  }}
                >
                  <option value="bunk">Litera</option>
                  <option value="single">Individual</option>
                  <option value="double">Matrimonial</option>
                  <option value="queen">Queen</option>
                  <option value="king">King</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => {
                    const updated = (formData.beds ?? []).filter((_, i) => i !== idx);
                    setFormData((prev) => ({ ...prev, beds: updated }));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

      {/* Card de Amenidades */}
        <TabsContent value="amenities" className="mt-0">
      <Card>
        <CardHeader>
          <CardTitle>Amenidades</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mostrando amenidades para: <strong>{amenityLang === 'es' ? 'Español' : 'English'}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 gap-1">
              <Button
                type="button"
                variant={amenityLang === 'es' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAmenityLang('es')}
              >
                Español
              </Button>
              <Button
                type="button"
                variant={amenityLang === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAmenityLang('en')}
              >
                English
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Editas la lista de amenidades en {amenityLang === 'es' ? 'Español' : 'English'}. El frontend mostrará automáticamente el idioma seleccionado por el visitante.
            </p>
          </div>

          {activeAmenities.length > 0 && (
            <div className="space-y-2">
              <Label>Amenidades Seleccionadas</Label>
              <p className="text-xs text-muted-foreground">
                {amenityLang === "es"
                  ? "Arrastra para cambiar el orden en que se muestran en el sitio."
                  : "Drag to change the display order on the site."}
              </p>
              <div className="flex max-w-xl flex-col gap-1.5">
                {activeAmenities.map((amenity, index) => (
                  <div
                    key={amenity}
                    className={`flex items-center gap-2 rounded-md border bg-secondary/50 px-2 py-1.5 ${
                      draggingAmenityIndex === index ? "ring-2 ring-primary opacity-70" : ""
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingAmenityIndex !== null) {
                        reorderAmenity(draggingAmenityIndex, index);
                      }
                      setDraggingAmenityIndex(null);
                    }}
                  >
                    <div
                      draggable
                      onDragStart={() => setDraggingAmenityIndex(index)}
                      onDragEnd={() => setDraggingAmenityIndex(null)}
                      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                      title={amenityLang === "es" ? "Arrastrar" : "Drag"}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm">{amenity}</span>
                    <button
                      type="button"
                      onClick={() => removeAmenity(amenity)}
                      className="rounded p-0.5 text-muted-foreground hover:text-red-600"
                      aria-label={amenityLang === "es" ? `Quitar ${amenity}` : `Remove ${amenity}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Amenidades Comunes</Label>
            <div className="flex flex-wrap gap-2">
              {commonAmenities
                .filter(amenity => !activeAmenities.includes(amenity))
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
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder={amenityLang === 'es' ? 'Nombre de la amenidad' : 'Amenity name'}
              />
              <Button type="button" onClick={() => { addAmenity(newAmenity); setNewAmenity(''); }} disabled={!newAmenity}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {newAmenitiesSinceLoad.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm text-amber-950 dark:text-amber-100">
                {amenityLang === "es"
                  ? "Amenidades nuevas en esta sesión. Puedes añadirlas al resto de propiedades sin reemplazar sus listas:"
                  : "New amenities in this session. You can add them to other properties without replacing their lists:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {newAmenitiesSinceLoad.map((amenity) => (
                  <Button
                    key={amenity}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50"
                    disabled={
                      isAmenitiesPending ||
                      isBulkAmenitiesPending ||
                      isBulkAppendPending
                    }
                    onClick={() => appendAmenityToAllProperties(amenity)}
                  >
                    {isBulkAppendPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {amenityLang === "es"
                      ? `Añadir «${amenity}» a todas`
                      : `Add «${amenity}» to all`}
                  </Button>
                ))}
              </div>
              {newAmenitiesSinceLoad.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    isAmenitiesPending ||
                    isBulkAmenitiesPending ||
                    isBulkAppendPending
                  }
                  onClick={appendAllNewAmenitiesToAllProperties}
                >
                  {amenityLang === "es"
                    ? `Añadir las ${newAmenitiesSinceLoad.length} nuevas a todas las propiedades`
                    : `Add all ${newAmenitiesSinceLoad.length} new to every property`}
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              disabled={
                isAmenitiesPending ||
                isBulkAmenitiesPending ||
                isBulkAppendPending
              }
              onClick={saveAmenitiesForCurrentProperty}
            >
              {isAmenitiesPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Guardar amenidades (esta propiedad)</>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isAmenitiesPending ||
                    isBulkAmenitiesPending ||
                    isBulkAppendPending
                  }
                >
                  {isBulkAmenitiesPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Aplicando...</>
                  ) : (
                    <>Aplicar a todas las propiedades ({amenityLang === "es" ? "ES" : "EN"})</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Aplicar amenidades a todas las propiedades?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se reemplazará la lista de amenidades en{" "}
                    <strong>{amenityLang === "es" ? "español" : "inglés"}</strong> en{" "}
                    <strong>todas</strong> las propiedades con la lista actual (
                    {activeAmenities.length} amenidad
                    {activeAmenities.length === 1 ? "" : "es"}).
                    {amenityLang === "es"
                      ? " Las amenidades en inglés no se modificarán."
                      : " Las amenidades en español no se modificarán."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={saveAmenitiesForAllProperties}>
                    Sí, aplicar a todas
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

      {/* Integración Hostfully (PMS) */}
        <TabsContent value="hostfully" className="mt-0">
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
        </TabsContent>

      {/* Contenido Hostfully (secciones de texto avanzadas) */}
        <TabsContent value="content" className="mt-0">
      <Card>
        <CardHeader>
          <CardTitle>Contenido Hostfully</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mostrando campos para: <strong>{contentLang === 'es' ? 'Español' : 'English'}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 gap-1">
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
          </div>

          <div className="grid grid-cols-1 gap-4">
            {contentFields.map((field) => (
              <div key={field.base} className="space-y-2">
                <Label htmlFor={`${field.base}-${contentLang}`}>
                  {contentLang === 'es' ? field.labelEs : field.labelEn}
                  {field.required ? ' *' : ''}
                </Label>
                <Textarea
                  id={`${field.base}-${contentLang}`}
                  rows={field.rows}
                  value={getLangValue(field.base, field.es, field.en)}
                  onChange={(e) => setLangValue(field.base, field.es, field.en, e.target.value)}
                  required={field.required}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

      {/* Card de Imágenes */}
        <TabsContent value="images" className="mt-0">
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
        </TabsContent>
      </Tabs>

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