import { notFound } from "next/navigation";
import { getTestimonialById } from "@/lib/firebase/content";
import TestimonialEditForm from "./edit-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditTestimonialPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditTestimonialPage({ params }: EditTestimonialPageProps) {
  // Esperamos los parametros
  const { id } = await params;
  
  const testimonial = await getTestimonialById(id);

  if (!testimonial) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

        <TestimonialEditForm initialData={testimonial} />
      </div>
  );
}