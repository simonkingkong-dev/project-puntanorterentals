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
import { ArrowLeft, Save, Wifi, Car, Utensils, Home, Waves, Shield, Star, Zap, Coffee } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';
import Link from 'next/link';
import { toast } from 'sonner';

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

/**
 * Renders a page for creating a new amenity with a form, preview, and submission handling.
 * @example
 * NewAmenityPage()
 * A JSX component for the new amenity page is rendered.
 * @returns {JSX.Element} Renders the New Amenity creation page component.
 */
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

  /**
   * Handles form submission by creating a new amenity and provides feedback to the user.
   * @example
   * sync(e)
   * // Redirects to '/admin/amenities' after successful creation
   * @param {React.FormEvent} e - The form event triggered by submission.
   * @returns {void} This function does not return a value, but navigates and displays success or error messages.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.title || !formData.description) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      const amenityData = {
        ...formData,
        createdAt: new Date(),
      };

      // In production, save to Firebase
      console.log('Creating amenity:', amenityData);
      
      toast.success('Amenidad creada exitosamente');
      router.push('/admin/amenities');
    } catch (error) {
      toast.error('Error creando la amenidad');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedIcon = availableIcons.find(icon => icon.value === formData.icon);
  const IconComponent = selectedIcon?.icon || Home;

  return (
    <AdminLayout>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
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
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Creando...' : 'Crear Amenidad'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/amenities">Cancelar</Link>
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}