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
// CORREGIDO: Añadimos Loader2
import { ArrowLeft, Plus, X, Upload, Loader2, Save } from 'lucide-react';
// CORREGIDO: Ruta del layout
import AdminLayout from '@/app/admin/layout';
import Link from 'next/link';
import { toast } from 'sonner';
// CORREGIDO: Importamos la función real de Firebase
import { createProperty } from '@/lib/firebase/properties';
// CORREGIDO: Importamos el tipo para el 'slug'
import { Property } from '@/lib/types';

const commonAmenities = [
  'WiFi de alta velocidad',
  'Aire acondicionado',
  'Piscina',
  'Vista al mar',
  'Cocina equipada',
  'Terraza privada',
  'Estacionamiento',
  'Servicio de limpieza',
  'Seguridad 24/7',
  'Acceso a playa',
  'Gym',
  'Spa',
  'Jacuzzi',
  'Barbacoa',
  'Jardín',
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    maxGuests: 2,
    pricePerNight: 100,
    featured: false,
    amenities: [] as string[],
    images: [] as string[],
  });

  const [newAmenity, setNewAmenity] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.title || !formData.description || !formData.location) {
        toast.error('Por favor completa todos los campos requeridos');
        setIsLoading(false); // CORREGIDO: Detener loading
        return;
      }

      if (formData.images.length === 0) {
        toast.error('Agrega al menos una imagen');
        setIsLoading(false); // CORREGIDO: Detener loading
        return;
      }

      // Create slug from title
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // CORREGIDO: Tipamos el objeto para asegurar que coincide con Omit<Property, 'id'>
      const propertyData: Omit<Property, 'id'> = {
        ...formData,
        slug,
        availability: {}, // Disponibilidad inicial vacía
        createdAt: new Date(), // El cliente genera la fecha
        updatedAt: new Date(),
      };

      // CORREGIDO: Reemplazamos el console.log con la llamada real a Firebase
      await createProperty(propertyData);
      
      toast.success('Propiedad creada exitosamente');
      router.push('/admin/properties');
    } catch (error) {
      console.error('Error creando la propiedad:', error); // CORREGIDO: Mejor log de error
      toast.error('Error creando la propiedad');
    } finally {
      setIsLoading(false);
    }
  };

  // El resto de tus funciones (addAmenity, removeAmenity, addImage, removeImage)
  // están perfectas y no necesitan cambios.
  
  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity],
      }));
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity),
    }));
  };

  const addImage = () => {
    if (newImageUrl && !formData.images.includes(newImageUrl)) {
      // Validación simple de URL (opcional pero recomendado)
      if (!newImageUrl.startsWith('http://') && !newImageUrl.startsWith('https://')) {
        toast.error('Por favor, introduce una URL válida (http:// o https://)');
        return;
      }
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImageUrl],
      }));
      setNewImageUrl('');
    }
  };

  const removeImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageUrl),
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
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Básica</CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                   <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                     placeholder="Casa Alkimia Suite Ocean View"
                    required
                  />
                </div>
                 
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input
                     id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Playa del Carmen, Riviera Maya"
                     required
                  />
                </div>
              </div>

               <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                   onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe la propiedad en detalle..."
                  rows={4}
                   required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="maxGuests">Máximo de Huéspedes</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                     min="1"
                    max="20"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: parseInt(e.target.value, 10) || 1 }))}
                   />
                </div>
                
                <div className="space-y-2">
                   <Label htmlFor="pricePerNight">Precio por Noche ($)</Label>
                  <Input
                    id="pricePerNight"
                    type="number"
                     min="1"
                    value={formData.pricePerNight}
                    onChange={(e) => setFormData(prev => ({ ...prev, pricePerNight: parseInt(e.target.value, 10) || 1 }))}
                  />
                 </div>

                <div className="space-y-2">
                  <Label>Propiedad Destacada</Label>
                  <div className="flex items-center space-x-2">
                     <Switch
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                     />
                    <span className="text-sm text-gray-600">
                      {formData.featured ? 'Sí' : 'No'}
                    </span>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Amenities */}
              {formData.amenities.length > 0 && (
                <div className="space-y-2">
                  <Label>Amenidades Seleccionadas</Label>
                  <div className="flex flex-wrap gap-2">
                     {formData.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                        {amenity}
                         <button
                          type="button"
                          onClick={() => removeAmenity(amenity)}
                           className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                         </button>
                      </Badge>
                    ))}
                   </div>
                </div>
              )}

              {/* Common Amenities */}
              <div className="space-y-2">
                 <Label>Amenidades Comunes</Label>
                <div className="flex flex-wrap gap-2">
                  {commonAmenities
                    .filter(amenity => !formData.amenities.includes(amenity))
                     .map((amenity) => (
                      <Button
                        key={amenity}
                        type="button"
                         variant="outline"
                        size="sm"
                        onClick={() => addAmenity(amenity)}
                       >
                        <Plus className="w-3 h-3 mr-1" />
                        {amenity}
                       </Button>
                    ))}
                </div>
              </div>

              {/* Custom Amenity */}
              <div className="space-y-2">
                <Label>Agregar Amenidad Personalizada</Label>
                <div className="flex gap-2">
                  <Input
                     value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="Nombre de la amenidad"
                  />
                   <Button
                    type="button"
                    onClick={() => {
                       addAmenity(newAmenity);
                      setNewAmenity('');
                    }}
                    disabled={!newAmenity}
                  >
                    <Plus className="w-4 h-4" />
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
             <CardHeader>
              <CardTitle>Galería de Imágenes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Images */}
               {formData.images.length > 0 && (
                <div className="space-y-2">
                  <Label>Imágenes Actuales (URL)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                     {formData.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                           src={imageUrl}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                         />
                        <button
                          type="button"
                           onClick={() => removeImage(imageUrl)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <X className="w-3 h-3" />
                        </button>
                      </div>
                     ))}
                  </div>
                </div>
              )}

              {/* Add New Image */}
               <div className="space-y-2">
                <Label>Agregar Nueva Imagen (URL)</Label>
                <div className="flex gap-2">
                  <Input
                     value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://images.pexels.com/..."
                  />
                   <Button
                    type="button"
                    onClick={addImage}
                    disabled={!newImageUrl}
                   >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                 <p className="text-sm text-gray-500">
                  Agrega URLs de imágenes. La primera será la imagen de portada.
                </p>
              </div>
            </CardContent>
           </Card>

          {/* Submit */}
          <div className="flex gap-4">
            {/* CORREGIDO: Botón con estado de carga */}
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Propiedad
                </>
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