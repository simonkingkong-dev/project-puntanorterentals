// Archivo: app/admin/properties/new/page.tsx

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
// CORREGIDO: Importamos la Server Action del Admin (que usa firebase-admin)
import { handleCreateProperty } from '../actions'; 
// Importamos la función de subida (Nota: esto sigue siendo cliente, asegúrate de que tus reglas de Storage lo permitan o sean públicas por ahora)
import { uploadImageToStorage } from '@/lib/firebase/storage';
import ImageUploader, { FileWithPreview } from '@/components/admin/image-uploader';
import { Property } from '@/lib/types';

const commonAmenities = [
  'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
  'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
  'Seguridad 24/7', 'Acceso a playa', 'Gym', 'Spa', 'Jacuzzi', 'Barbacoa', 'Jardín',
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // El estado del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    maxGuests: 2,
    pricePerNight: 100,
    featured: false,
    amenities: [] as string[],
  });
  
  // Estado para manejar los archivos en cola
  const [imageFiles, setImageFiles] = useState<FileWithPreview[]>([]);
  const [newAmenity, setNewAmenity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validación de formulario
    if (!formData.title || !formData.description || !formData.location) {
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
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // 2. Preparamos el objeto final.
      // NOTA: 'availability' se inicializa vacío. Las fechas se manejan como Objetos Date.
      const propertyData: Omit<Property, 'id'> = {
        ...formData,
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
  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
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
          {/* Card de Información Básica */}
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

          {/* Card de Amenidades */}
          <Card>
            <CardHeader><CardTitle>Amenidades</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {formData.amenities.length > 0 && (
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
                  {commonAmenities.filter(amenity => !formData.amenities.includes(amenity)).map((amenity) => (
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

          {/* Card de Imágenes */}
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

          {/* Submit */}
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