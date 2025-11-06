"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Plus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Property } from "@/lib/types";
import { handleUpdateProperty, UpdatePropertyFormData } from "../../actions";

// Lista de amenidades comunes (igual que en new/page.tsx)
const commonAmenities = [
  'WiFi de alta velocidad', 'Aire acondicionado', 'Piscina', 'Vista al mar',
  'Cocina equipada', 'Terraza privada', 'Estacionamiento', 'Servicio de limpieza',
  'Seguridad 24/7', 'Acceso a playa', 'Gym', 'Spa', 'Jacuzzi', 'Barbacoa', 'Jardín',
];

interface PropertyEditFormProps {
  initialData: Property; // Recibimos los datos de la página
}

export default function PropertyEditForm({ initialData }: PropertyEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // 1. El estado se inicializa con los datos de la propiedad
  const [formData, setFormData] = useState<UpdatePropertyFormData>({
    title: initialData.title,
    description: initialData.description,
    location: initialData.location,
    maxGuests: initialData.maxGuests,
    pricePerNight: initialData.pricePerNight,
    featured: initialData.featured,
    amenities: initialData.amenities,
    images: initialData.images,
  });

  const [newAmenity, setNewAmenity] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      // 2. Llamamos a la Server Action con el ID y los nuevos datos
      const result = await handleUpdateProperty(initialData.id, formData);
      
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Propiedad actualizada exitosamente.");
        // La redirección ocurre en la Server Action
      }
    });
  };

  // --- Lógica para manejar amenidades e imágenes (idéntica a new/page.tsx) ---
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

  const addImage = () => {
    if (newImageUrl && !formData.images?.includes(newImageUrl)) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), newImageUrl]
      }));
      setNewImageUrl('');
    }
  };

  const removeImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img !== imageUrl)
    }));
  };
  // --- Fin de la lógica ---

  return (
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

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                value={formData.maxGuests}
                onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: parseInt(e.target.value) || 1 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerNight">Precio por Noche ($)</Label>
              <Input
                id="pricePerNight"
                type="number"
                min="1"
                value={formData.pricePerNight}
                onChange={(e) => setFormData(prev => ({ ...prev, pricePerNight: parseInt(e.target.value) || 1 }))}
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
          {formData.amenities && formData.amenities.length > 0 && (
            <div className="space-y-2">
              <Label>Amenidades Seleccionadas</Label>
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <button type="button" onClick={() => removeAmenity(amenity)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
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
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Nombre de la amenidad"
              />
              <Button type="button" onClick={() => { addAmenity(newAmenity); setNewAmenity(''); }} disabled={!newAmenity}>
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
          {formData.images && formData.images.length > 0 && (
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
                    <button type="button" onClick={() => removeImage(imageUrl)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Agregar Nueva Imagen (URL)</Label>
            <div className="flex gap-2">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="URL de la imagen"
              />
              <Button type="button" onClick={addImage} disabled={!newImageUrl}>
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </form>
  );
}