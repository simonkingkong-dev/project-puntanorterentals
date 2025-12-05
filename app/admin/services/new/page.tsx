"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import AdminLayout from '@/app/admin/layout';
import Link from 'next/link';
import { toast } from 'sonner';
// CORREGIDO: Importamos la Server Action
import { handleCreateService } from '../actions';

export default function NewServicePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '', // URL de imagen
    externalLink: '',
    featured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validar formulario
      if (!formData.title || !formData.description || !formData.image || !formData.externalLink) {
        toast.error('Por favor completa todos los campos requeridos');
        setIsLoading(false);
        return;
      }
      
      // Llamamos a la Server Action de Admin
      const result = await handleCreateService(formData);

      // Manejo de error si la acción falla
      if (result && !result.success) {
        toast.error(result.error || "Error al crear el servicio");
        setIsLoading(false);
        return;
      }
      
      toast.success('Servicio creado exitosamente');
      // No necesitamos router.push porque la acción hace redirect
    
    } catch (error) {
      console.error('Error creando el servicio:', error);
      toast.error('Error inesperado. Revisa la consola.');
      setIsLoading(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/services">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Servicio</h1>
            <p className="text-gray-600">Crea un nuevo servicio o experiencia afiliada</p>
          </div>
        </div>

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
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Servicio
                </>
              )}
            </Button>
            <Button asChild variant="outline" disabled={isLoading}>
              <Link href="/admin/services">Cancelar</Link>
            </Button>
          </div>
        </form>
      </div>
  );
}