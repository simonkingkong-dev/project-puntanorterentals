// Archivo: app/admin/amenities/[id]/edit/page.tsx

import { notFound } from "next/navigation";
import { getGlobalAmenityById } from "@/lib/firebase/content"; // Función que ya existe
import AdminLayout from "@/app/admin/layout";
import AmenityEditForm from "./edit-form"; // El formulario que crearemos a continuación
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface EditAmenityPageProps {
  params: {
    id: string; // Next.js nos da el [id] de la URL aquí
  };
}

export default async function EditAmenityPage({ params }: EditAmenityPageProps) {
  const { id } = params;
  
  // 1. Obtenemos los datos de la amenidad específica
  const amenity = await getGlobalAmenityById(id);

  // 2. Si no existe, mostramos un 404
  if (!amenity) {
    notFound();
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/admin/amenities">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Amenidades
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Amenidad</h1>
            <p className="text-gray-600">Modificando: {amenity.title}</p>
          </div>
        </div>

        {/* 3. Pasamos los datos cargados al formulario (Client Component) */}
        <AmenityEditForm initialData={amenity} />
      </div>
    </AdminLayout>
  );
}