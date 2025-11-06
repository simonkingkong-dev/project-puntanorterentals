"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { Testimonial } from "@/lib/types";
// Importamos la Server Action de actualización
import { handleUpdateTestimonial, UpdateTestimonialFormData } from "../../actions";

interface TestimonialEditFormProps {
  initialData: Testimonial; // Recibimos los datos de la página
}

export default function TestimonialEditForm({ initialData }: TestimonialEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // 1. El estado se inicializa con los datos del testimonio
  const [formData, setFormData] = useState<UpdateTestimonialFormData>({
    name: initialData.name,
    text: initialData.text,
    image: initialData.image || '',
    rating: initialData.rating,
    location: initialData.location || '',
    featured: initialData.featured,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      // 2. Llamamos a la Server Action con el ID y los nuevos datos
      const result = await handleUpdateTestimonial(initialData.id, formData);
      
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Testimonio actualizado exitosamente.");
        // La redirección ocurre en la Server Action
      }
    });
  };

  // Función para renderizar las estrellas
  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, rating: i + 1 }))}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                i < (formData.rating || 0)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
           </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          ({formData.rating || 0}/5)
        </span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="María González"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación (Opcional)</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ciudad de México"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">URL de la Foto (Opcional)</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Testimonial Content */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido del Testimonio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Testimonio *</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Una experiencia absolutamente increíble..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Calificación</Label>
            {renderStarRating()}
          </div>

          <div className="space-y-2">
            <Label>Testimonio Destacado</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
              />
              <span className="text-sm text-gray-600">
                {formData.featured ? 'Se mostrará en la página principal' : 'Testimonio regular'}
              </span>
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