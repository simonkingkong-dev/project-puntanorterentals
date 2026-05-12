
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, X, Loader2, Save, Link2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { handleCreateProperty } from '../actions'; 
import { uploadImageToStorage } from '@/lib/firebase/storage';
import ImageUploader, { FileWithPreview } from '@/components/admin/image-uploader';
import { Property } from '@/lib/types';
import {
  DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT,
  DEFAULT_INCLUDED_GUESTS,
} from '@/lib/pricing-guests';

const commonAmenitiesByLang = {
  es: [
    'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
    'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
    'Seguridad 24/7', 'Acceso a playa', 'Gimnasio', 'Spa', 'Jacuzzi', 'Barbacoa', 'Jardín',
  ],
  en: [
    'High-speed WiFi', 'Air conditioning', 'Pool', 'Ocean view',
    'Equipped kitchen', 'Private terrace', 'Parking', 'Cleaning service',
    '24/7 security', 'Beach access', 'Gym', 'Spa', 'Jacuzzi', 'BBQ grill', 'Garden',
  ],
};

type NewPropertyFormState = Omit<
  Partial<Property>,
  | 'images'
  | 'availability'
  | 'slug'
  | 'createdAt'
  | 'updatedAt'
  | 'hostfullyCalendarWidgetId'
  | 'hostfullyCalendarShowTentative'
  | 'hostfullyCalendarMonthsToDisplay'
> & {
  titleEs: string;
  titleEn: string;
  title: string;
  description: string;
  location: string;
  maxGuests: number;
  pricePerNight: number;
  includedGuests: number;
  extraGuestFeePerNight: number;
  featured: boolean;
  amenities: string[];
  amenitiesEs: string[];
  amenitiesEn: string[];
  hostfullyCalendarWidgetId: string;
  hostfullyCalendarShowTentative: string;
  hostfullyCalendarMonthsToDisplay: string;
};

export default function NewPropertyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contentLang, setContentLang] = useState<'es' | 'en'>('es');
  const [amenityLang, setAmenityLang] = useState<'es' | 'en'>('es');
  
  // El estado del formulario
  const [formData, setFormData] = useState<NewPropertyFormState>({
    internalName: '',
    titleEs: '',
    titleEn: '',
    title: '',
    description: '',
    descriptionEs: '',
    descriptionEn: '',
    summary: '',
    summaryEs: '',
    summaryEn: '',
    shortDescription: '',
    shortDescriptionEs: '',
    shortDescriptionEn: '',
    longDescription: '',
    longDescriptionEs: '',
    longDescriptionEn: '',
    notes: '',
    notesEs: '',
    notesEn: '',
    interaction: '',
    interactionEs: '',
    interactionEn: '',
    neighborhood: '',
    neighborhoodEs: '',
    neighborhoodEn: '',
    access: '',
    accessEs: '',
    accessEn: '',
    space: '',
    spaceEs: '',
    spaceEn: '',
    transit: '',
    transitEs: '',
    transitEn: '',
    houseManual: '',
    houseManualEs: '',
    houseManualEn: '',
    location: '',
    maxGuests: 2,
    pricePerNight: 100,
    includedGuests: DEFAULT_INCLUDED_GUESTS,
    extraGuestFeePerNight: DEFAULT_EXTRA_GUEST_FEE_USD_PER_NIGHT,
    featured: false,
    amenities: [] as string[],
    amenitiesEs: [] as string[],
    amenitiesEn: [] as string[],
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    hostfullyPropertyId: '',
    hostfullyLeadWidgetUuid: '',
    hostfullyLeadWidgetOptionsJson: '',
    hostfullyCalendarWidgetId: '',
    hostfullyCalendarWidgetName: '',
    hostfullyCalendarShowTentative: '',
    hostfullyCalendarMonthsToDisplay: '',
  });
  
  // Estado para manejar los archivos en cola
  const [imageFiles, setImageFiles] = useState<FileWithPreview[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const activeAmenities = amenityLang === 'es' ? formData.amenitiesEs : formData.amenitiesEn;
  const commonAmenities = commonAmenitiesByLang[amenityLang];

  const getLangValue = (
    baseKey: keyof NewPropertyFormState,
    esKey: keyof NewPropertyFormState,
    enKey: keyof NewPropertyFormState
  ) => {
    const value = contentLang === 'es' ? formData[esKey] : formData[enKey];
    if (typeof value === 'string') return value;
    const fallback = formData[baseKey];
    return typeof fallback === 'string' ? fallback : '';
  };

  const setLangValue = (
    baseKey: keyof NewPropertyFormState,
    esKey: keyof NewPropertyFormState,
    enKey: keyof NewPropertyFormState,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [baseKey]: contentLang === 'es' ? value : prev[baseKey],
      [contentLang === 'es' ? esKey : enKey]: value,
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validación de formulario
    if (!formData.titleEs || !formData.titleEn || !formData.description || !formData.location) {
      toast.error('Por favor completa todos los campos requeridos');
      setIsLoading(false);
      return;
    }

    // Validación de imágenes
    if (imageFiles.length === 0) {
      toast.error('Agrega al menos una imagen');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Subir todas las imágenes en cola a Firebase Storage (Cliente)
      toast.info("Subiendo imágenes... esto puede tardar un momento.");
      const uploadPromises = imageFiles.map(file => uploadImageToStorage(file, 'properties'));
      
      // Esperamos a que todas las imágenes se suban y obtenemos las URLs
      const imageUrls = await Promise.all(uploadPromises);

      // Generamos el slug básico para el objeto (aunque el server action lo regenera por seguridad)
      const canonicalTitle = formData.titleEs.trim();
      const slug = canonicalTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const hostfullyCalendarWidgetId = formData.hostfullyCalendarWidgetId.trim()
        ? Number(formData.hostfullyCalendarWidgetId)
        : undefined;
      const hostfullyCalendarShowTentative = formData.hostfullyCalendarShowTentative.trim()
        ? Number(formData.hostfullyCalendarShowTentative)
        : undefined;
      const hostfullyCalendarMonthsToDisplay = formData.hostfullyCalendarMonthsToDisplay.trim()
        ? Number(formData.hostfullyCalendarMonthsToDisplay)
        : undefined;

      // 2. Preparamos el objeto final.
      // NOTA: 'availability' se inicializa vacío. Las fechas se manejan como Objetos Date.
      const propertyData: Omit<Property, 'id'> = {
        ...formData,
        title: canonicalTitle,
        titleEs: formData.titleEs.trim(),
        titleEn: formData.titleEn.trim(),
        description: formData.description.trim(),
        descriptionEs: formData.descriptionEs?.trim(),
        descriptionEn: formData.descriptionEn?.trim(),
        hostfullyCalendarWidgetId: hostfullyCalendarWidgetId != null && Number.isFinite(hostfullyCalendarWidgetId)
          ? hostfullyCalendarWidgetId
          : undefined,
        hostfullyCalendarShowTentative: hostfullyCalendarShowTentative != null && Number.isFinite(hostfullyCalendarShowTentative)
          ? hostfullyCalendarShowTentative
          : undefined,
        hostfullyCalendarMonthsToDisplay: hostfullyCalendarMonthsToDisplay != null && Number.isFinite(hostfullyCalendarMonthsToDisplay)
          ? hostfullyCalendarMonthsToDisplay
          : undefined,
        images: imageUrls, 
        slug,
        availability: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Llamamos a la Server Action de Admin
      // Esta función se ejecuta en el servidor con permisos de administrador
      const result = await handleCreateProperty(propertyData);
      
      // Si la acción devuelve un error, lo mostramos
      if (result && !result.success) {
         toast.error(result.error || "Error desconocido al crear la propiedad");
         setIsLoading(false);
         return;
      }
      
      // Si todo sale bien, la Server Action se encarga del redirect.
      toast.success('Propiedad creada exitosamente');

    } catch (error) {
      console.error('Error creando la propiedad:', error);
      toast.error('Error al crear la propiedad. Revisa la consola.');
      setIsLoading(false);
    }
  };

  // --- Lógica de Amenidades ---
  const setAmenitiesForActiveLang = (amenities: string[]) => {
    setFormData(prev => ({
      ...prev,
      amenities: amenityLang === 'es' ? amenities : prev.amenities,
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/properties">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Propiedad</h1>
            <p className="text-gray-600">Crea una nueva propiedad en el sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="basic" className="border data-[state=active]:border-primary">Información básica</TabsTrigger>
              <TabsTrigger value="amenities" className="border data-[state=active]:border-primary">Amenidades</TabsTrigger>
              <TabsTrigger value="content" className="border data-[state=active]:border-primary">Contenido</TabsTrigger>
              <TabsTrigger value="images" className="border data-[state=active]:border-primary">Galería de imágenes</TabsTrigger>
              <TabsTrigger value="hostfully" className="border data-[state=active]:border-primary">Integración Hostfully</TabsTrigger>
            </TabsList>

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
                        onChange={(e) => setFormData(prev => ({ ...prev, internalName: e.target.value }))}
                        placeholder="Ej: Casa Naranja Principal / Unidad A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="titleEs">Título (ES) *</Label>
                      <Input
                        id="titleEs"
                        value={formData.titleEs}
                        onChange={(e) => setFormData(prev => ({ ...prev, titleEs: e.target.value, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="titleEn">Title (EN) *</Label>
                      <Input
                        id="titleEn"
                        value={formData.titleEn}
                        onChange={(e) => setFormData(prev => ({ ...prev, titleEn: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        required
                      />
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
                          setFormData(prev => ({ ...prev, latitude: value === '' ? undefined : parseFloat(value) }));
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
                          setFormData(prev => ({ ...prev, longitude: value === '' ? undefined : parseFloat(value) }));
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
                    <div className="space-y-2">
                      <Label htmlFor="includedGuests">Huéspedes incluidos en la tarifa</Label>
                      <Input id="includedGuests" type="number" min="1" value={formData.includedGuests} onChange={(e) => setFormData(prev => ({ ...prev, includedGuests: parseInt(e.target.value, 10) || 1 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extraGuestFeePerNight">Cargo extra / huésped / noche (USD)</Label>
                      <Input id="extraGuestFeePerNight" type="number" min="0" step="0.01" value={formData.extraGuestFeePerNight} onChange={(e) => setFormData(prev => ({ ...prev, extraGuestFeePerNight: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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
                      <Button type="button" variant={amenityLang === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => setAmenityLang('es')}>
                        Español
                      </Button>
                      <Button type="button" variant={amenityLang === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => setAmenityLang('en')}>
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
                      <div className="flex flex-wrap gap-2">
                        {activeAmenities.map((amenity) => (
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
                      {commonAmenities.filter(amenity => !activeAmenities.includes(amenity)).map((amenity) => (
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
                </CardContent>
              </Card>
            </TabsContent>

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
                      <Button type="button" variant={contentLang === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => setContentLang('es')}>
                        Español
                      </Button>
                      <Button type="button" variant={contentLang === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => setContentLang('en')}>
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

            <TabsContent value="images" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Galería de Imágenes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImageUploader
                    files={imageFiles}
                    onFilesChange={setImageFiles}
                    folder="properties"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hostfully" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Integración Hostfully (PMS)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hostfullyPropertyId">UID de Propiedad en Hostfully</Label>
                    <Input id="hostfullyPropertyId" value={formData.hostfullyPropertyId ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyPropertyId: e.target.value }))} placeholder="Ej: abc123-def456-..." />
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium text-gray-900">Widget Lead / reserva (leadCaptureWidget)</p>
                    <Label htmlFor="hostfullyLeadWidgetUuid">UUID del widget Lead</Label>
                    <Input id="hostfullyLeadWidgetUuid" value={formData.hostfullyLeadWidgetUuid ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyLeadWidgetUuid: e.target.value }))} placeholder="bd250250-08a1-49d8-b2ee-d49588fbaf9d" />
                    <Label htmlFor="hostfullyLeadWidgetOptionsJson">JSON de opciones (3º argumento de Widget)</Label>
                    <Textarea id="hostfullyLeadWidgetOptionsJson" rows={6} className="font-mono text-xs" value={formData.hostfullyLeadWidgetOptionsJson ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyLeadWidgetOptionsJson: e.target.value }))} placeholder='{"type":"property",...}' />
                  </div>
                  <div className="space-y-2 border-t pt-4">
                    <p className="text-sm font-medium text-gray-900">Widget calendario Orbi (opcional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hostfullyCalendarWidgetId">Id numérico del calendario</Label>
                        <Input id="hostfullyCalendarWidgetId" inputMode="numeric" value={formData.hostfullyCalendarWidgetId} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyCalendarWidgetId: e.target.value }))} placeholder="179135" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hostfullyCalendarWidgetName">Nombre en el calendario</Label>
                        <Input id="hostfullyCalendarWidgetName" value={formData.hostfullyCalendarWidgetName ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyCalendarWidgetName: e.target.value }))} placeholder="01 Casa Naranja" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hostfullyCalendarShowTentative">showTentative (0/1)</Label>
                        <Input id="hostfullyCalendarShowTentative" inputMode="numeric" value={formData.hostfullyCalendarShowTentative} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyCalendarShowTentative: e.target.value }))} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hostfullyCalendarMonthsToDisplay">Meses a mostrar</Label>
                        <Input id="hostfullyCalendarMonthsToDisplay" inputMode="numeric" value={formData.hostfullyCalendarMonthsToDisplay} onChange={(e) => setFormData(prev => ({ ...prev, hostfullyCalendarMonthsToDisplay: e.target.value }))} placeholder="2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Crear Propiedad</>
              )}
            </Button>
            <Button asChild variant="outline" disabled={isLoading}>
              <Link href="/admin/properties">Cancelar</Link>
            </Button>
          </div>
        </form>
      </div>
  );
}