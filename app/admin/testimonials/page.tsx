import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Star, User } from 'lucide-react';
import Image from 'next/image';
import { getAdminTestimonials } from '@/lib/firebase-admin-queries';
import DeleteTestimonialButton from './delete-testimonials-button';

export const dynamic = 'force-dynamic';

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-4 h-4 ${
        i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
      }`}
    />
  ));
};

export default async function AdminTestimonialsPage() {
  const testimonials = await getAdminTestimonials();

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Testimonios</h1>
            <p className="text-gray-600">Gestiona los testimonios de clientes</p>
          </div>
          <Button asChild>
            <Link href="/admin/testimonials/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Testimonio
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{testimonials.length}</div>
              <p className="text-sm text-gray-600">Total Testimonios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {testimonials.filter(t => t.featured).length}
              </div>
              <p className="text-sm text-gray-600">Destacados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {testimonials.length > 0
                  ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length).toFixed(1)
                  : 'N/A'
                }
              </div>
              <p className="text-sm text-gray-600">Calificación Promedio</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {testimonials.filter(t => t.rating === 5).length}
              </div>
              <p className="text-sm text-gray-600">5 Estrellas</p>
            </CardContent>
          </Card>
        </div>

        {/* Testimonials Grid */}
        {testimonials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {testimonial.image ? (
                        <div className="relative w-12 h-12">
                          <Image
                            src={testimonial.image}
                            alt={testimonial.name}
                            fill
                            className="object-cover rounded-full"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        {testimonial.location && (
                          <p className="text-sm text-gray-600">{testimonial.location}</p>
                        )}
                      </div>
                    </div>
                    {testimonial.featured && (
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        Destacado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-1">
                    {renderStars(testimonial.rating)}
                    <span className="ml-2 text-sm text-gray-600">
                      ({testimonial.rating}/5)
                    </span>
                  </div>
                  
                  <p className="text-gray-700 line-clamp-3">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/admin/testimonials/${testimonial.id}/edit`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    
                    <DeleteTestimonialButton testimonialId={testimonial.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay testimonios registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando el primer testimonio de un cliente satisfecho.
              </p>
              <Button asChild>
                <Link href="/admin/testimonials/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Testimonio
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
  );
}