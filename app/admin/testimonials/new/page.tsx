"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Star } from 'lucide-react';
import AdminLayout from '@/components/admin/layout';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewTestimonialPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    text: '',
    image: '',
    rating: 5,
    location: '',
    featured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.text) {
        toast.error('Por favor completa todos los campos requeridos');
        return;
      }

      if (formData.rating < 1 || formData.rating > 5) {
        toast.error('La calificación debe estar entre 1 y 5 estrellas');
        return;
      }

      const testimonialData = {
        ...formData,
        createdAt: new Date(),
      };

      // In production, save to Firebase
      console.log('Creating testimonial:', testimonialData);
      
      toast.success('Testimonio creado exitosamente');
      router.push('/admin/testimonials');
    } catch (error) {
      toast.error('Error creando el testimonio');
    } finally {
      setIsLoading(false);
    }
  };

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
                i < formData.rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          ({formData.rating}/5)
        </span>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/testimonials">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Testimonio</h1>
            <p className="text-gray-600">Agrega un nuevo testimonio de cliente</p>
          </div>
        </div>

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
                  <Label htmlFor="location">Ubicación</Label>
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
                <p className="text-sm text-gray-500">
                  Agrega una URL de imagen para mostrar la foto del cliente
                </p>
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
                  placeholder="Una experiencia absolutamente increíble. La propiedad superó todas nuestras expectativas..."
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

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt={formData.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        {formData.name.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold">{formData.name || 'Nombre del Cliente'}</h4>
                    {formData.location && (
                      <p className="text-sm text-gray-600">{formData.location}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-gray-700 italic">
                  "{formData.text || 'El testimonio aparecerá aquí...'}"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Creando...' : 'Crear Testimonio'}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/testimonials">Cancelar</Link>
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}