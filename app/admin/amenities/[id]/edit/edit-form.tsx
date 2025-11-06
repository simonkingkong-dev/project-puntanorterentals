"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, Wifi, Car, Utensils, Home, Waves, Shield, Star, Zap, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { GlobalAmenity } from "@/lib/types";
// Importamos la Server Action de actualización
import { handleUpdateAmenity, UpdateAmenityFormData } from "../../actions";

// Lista de íconos (la misma que en 'new/page.tsx')
const availableIcons = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'car', label: 'Estacionamiento', icon: Car },
  { value: 'utensils', label: 'Cocina', icon: Utensils },
  { value: 'home', label: 'Casa/Hogar', icon: Home },
  { value: 'waves', label: 'Piscina/Agua', icon: Waves },
  { value: 'shield', label: 'Seguridad', icon: Shield },
  { value: 'star', label: 'Premium', icon: Star },
  { value: 'zap', label: 'Energía', icon: Zap },
  { value: 'coffee', label: 'Café/Desayuno', icon: Coffee },
];

interface AmenityEditFormProps {
  initialData: GlobalAmenity; // Recibimos los datos de la página (Server Component)
}

export default function AmenityEditForm({ initialData }: AmenityEditFormProps) {
  const [isPending, startTransition] = useTransition();
  
  // 1. El estado se inicializa con los datos de la amenidad
  const [formData, setFormData] = useState<UpdateAmenityFormData>({
    title: initialData.title,
    description: initialData.description,
    icon: initialData.icon,
    featured: initialData.featured,
    order: initialData.order,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      // 2. Llamamos a la Server Action con el ID y los nuevos datos
      const result = await handleUpdateAmenity(initialData.id, formData);
      
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Amenidad actualizada exitosamente.");
        // La redirección ahora ocurre en la Server Action
      }
    });
  };

  const selectedIcon = availableIcons.find(icon => icon.value === formData.icon);
  const IconComponent = selectedIcon?.icon || Home;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="WiFi de Alta Velocidad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Conexión a internet de fibra óptica..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icono</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData((prev) => ({ ...prev, icon: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un icono" />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <icon.icon className="w-4 h-4" />
                        {icon.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Orden de Visualización</Label>
              <Input
                id="order"
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amenidad Destacada</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, featured: checked }))}
              />
              <span className="text-sm text-gray-600">
                {formData.featured ? 'Se mostrará en la página principal' : 'Amenidad regular'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Vista Previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <IconComponent className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {formData.title || 'Título de la Amenidad'}
              </h3>
              <p className="text-sm text-gray-600">
                {formData.description || 'Descripción de la amenidad...'}
              </p>
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