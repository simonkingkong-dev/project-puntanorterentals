"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Wifi, Car, Utensils, Home, Waves, Shield, Star, Zap, Coffee, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
// CORREGIDO: Importamos la Server Action
import { handleCreateAmenity } from '../actions';

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

export default function NewAmenityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'home',
    featured: false,
    order: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validaciones
      if (!formData.title || !formData.description) {
        toast.error('Por favor completa todos los campos requeridos');
        setIsLoading(false); 
        return;
      }
      
      // Llamamos a la Server Action de Admin
      const result = await handleCreateAmenity(formData);
      
      if (result && !result.success) {
        toast.error(result.error || "Error al crear la amenidad");
        setIsLoading(false);
        return;
      }
      
      toast.success('Amenidad creada exitosamente');

    } catch (error) {
      console.error('Error creando la amenidad:', error); 
      toast.error('Error inesperado al crear la amenidad');
      setIsLoading(false);
    }
  };

  const selectedIcon = availableIcons.find(icon => icon.value === formData.icon);
  const IconComponent = selectedIcon?.icon || Home;

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/amenities">
               <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nueva Amenidad</h1>
             <p className="text-gray-600">Agrega una nueva amenidad global</p>
          </div>
        </div>

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
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="WiFi de Alta Velocidad"
                  required
                />
              </div>

              <div className="space-y-2">
                 <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                   onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Conexión a internet de fibra óptica en todas las áreas de la propiedad"
                  rows={3}
                  required
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icono</Label>
                  <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Amenidad Destacada</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.featured}
                     onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
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
                    {formData.description || 'Descripción de la amenidad aparecerá aquí...'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">Orden: {formData.order}</span>
                    {formData.featured && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                         Destacada
                      </span>
                    )}
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
             <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Amenidad
                </>
              )}
            </Button>
            <Button asChild variant="outline" disabled={isLoading}>
               <Link href="/admin/amenities">Cancelar</Link>
            </Button>
          </div>
      </form>
      </div>
  );
}