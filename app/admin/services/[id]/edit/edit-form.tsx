"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Service } from "@/lib/types";
// Importamos la Server Action de actualización
import { handleUpdateService, UpdateServiceFormData } from "../../actions";

interface ServiceEditFormProps {
  initialData: Service; // Recibimos los datos de la página
}

export default function ServiceEditForm({ initialData }: ServiceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // 1. El estado se inicializa con los datos del servicio
  const [formData, setFormData] = useState<UpdateServiceFormData>({
    title: initialData.title,
    description: initialData.description,
    image: initialData.image,
    externalLink: initialData.externalLink,
    featured: initialData.featured,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      // 2. Llamamos a la Server Action con el ID y los nuevos datos
      const result = await handleUpdateService(initialData.id, formData);
      
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Servicio actualizado exitosamente.");
        // La redirección ocurre en la Server Action
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Experiencia de Buceo en Cenotes"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe la experiencia en detalle..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">URL de la Imagen *</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
              placeholder="https://images.pexels.com/photos/..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalLink">Enlace de Reserva Externo *</Label>
            <Input
              id="externalLink"
              type="url"
              value={formData.externalLink}
              onChange={(e) => setFormData(prev => ({ ...prev, externalLink: e.target.value }))}
              placeholder="https://partner.com/reserva-cenotes"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Servicio Destacado</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
              />
              <span className="text-sm text-gray-600">
                {formData.featured ? 'Se mostrará en la página principal' : 'Servicio regular'}
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