// Archivo: app/admin/testimonials/[id]/edit/page.tsx

import { notFound } from "next/navigation";
import { getTestimonialById } from "@/lib/firebase/content"; // Función que acabamos de crear
import AdminLayout from "@/app/admin/layout";
import TestimonialEditForm from "./edit-form"; // El formulario que crearemos a continuación
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditTestimonialPageProps {
  params: {
    id: string; // Next.js nos da el [id] de la URL aquí
  };
}

export default async function EditTestimonialPage({ params }: EditTestimonialPageProps) {
  const { id } = params;
  
  // 1. Obtenemos los datos del testimonio específico
  const testimonial = await getTestimonialById(id);

  // 2. Si no existe, mostramos un 404
  if (!testimonial) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/testimonials">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Testimonios
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Testimonio</h1>
            <p className="text-gray-600 truncate">Modificando: {testimonial.name}</p>
          </div>
        </div>

        {/* 3. Pasamos los datos cargados al formulario (Client Component) */}
        <TestimonialEditForm initialData={testimonial} />
      </div>
    </AdminLayout>
  );
}